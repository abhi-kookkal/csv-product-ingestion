from fastapi import FastAPI, Depends, HTTPException, status, Response, File, UploadFile, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from . import crud, models, schemas, tasks
from .schemas import ProductInDB, ProductCreate
from .database import get_db
from .tasks import process_csv_import
import uuid, tempfile, os
import fastapi.middleware.cors

app = FastAPI(title="Acme Products Importer")

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload-csv/", status_code=202)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "File must be CSV")

    # Save uploaded file temporarily
    suffix = ".csv"
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    contents = await file.read()
    temp.write(contents)
    temp.close()

    # Fire & forget Celery task – returns immediately
    result = process_csv_import.delay(temp.name)

    return {"task_id": result.id, "status": "File uploaded – processing started"}

@app.get("/tasks/{task_id}/status")
def get_task_status(task_id: str):
    task = process_csv_import.AsyncResult(task_id = task_id)
    if task.state == 'PENDING':
        response = {"state": task.state, "progress": 0}
    elif task.state != 'FAILURE':
        response = {
            "state": task.state,
            "progress": task.info.get('progress', 0),
            "current": task.info.get('current', 0),
            "total": task.info.get('total', None)}
    else:
        response = {"state": task.state, "error": str(task.info.get('exc_info'))}

    return response

from sqlalchemy.exc import IntegrityError

@app.post("/products/", response_model=ProductInDB)
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db)):
    try:
        return await crud.create_product(db=db, obj_in=product)
    except IntegrityError as e:
        await db.rollback()
        if 'duplicate key value violates unique constraint' in str(e.orig):
            raise HTTPException(status_code=400, detail=f"SKU '{product.sku}' already exists.")
        raise HTTPException(status_code=400, detail="Database integrity error.")

@app.get("/products/")
async def read_products(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    sku: str | None = Query(default=None),
    active: bool | None = None
):
    products = await crud.get_products(db, skip=skip, limit=limit, sku=sku, active=active)
    return products

@app.delete("/products/all", status_code=204)
async def delete_all_products(db: AsyncSession = Depends(get_db)):
    await crud.remove_all_products(db=db)
    return Response(status_code=204)


# ──────────────────────────────────────────────────────────────
# WEBHOOKS
# ──────────────────────────────────────────────────────────────

from .models import Webhook
from .schemas import WebhookCreate, WebhookInDB
from typing import List
import httpx
import asyncio


# === 1. CREATE WEBHOOK ===
@app.post("/webhooks/", response_model=WebhookInDB)
async def create_webhook(webhook: WebhookCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_webhook(db=db, obj_in=webhook)

# === 2. LIST ALL WEBHOOKS ===
@app.get("/webhooks/", response_model=List[WebhookInDB])
async def get_webhooks(db: AsyncSession = Depends(get_db)):
    return await crud.get_webhooks(db=db)

# === 3. UPDATE WEBHOOK (enable/disable, change events/url) ===
@app.put("/webhooks/{webhook_id}", response_model=WebhookInDB)
async def update_webhook(
    webhook_id: int,
    webhook_in: WebhookCreate,
    db: AsyncSession = Depends(get_db)
):
    webhook = await crud.update_webhook(db=db, webhook_id=webhook_id, obj_in=webhook_in)
    if not webhook:
        raise HTTPException(404, "Webhook not found")
    return webhook

# === 4. DELETE WEBHOOK ===
@app.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: int, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_webhook(db=db, webhook_id=webhook_id)
    if not success:
        raise HTTPException(404, "Webhook not found")
    return {"detail": "Webhook deleted"}

# === 5. TEST WEBHOOK (sends fake payload) ===
@app.post("/webhooks/{webhook_id}/test")
async def test_webhook_endpoint(webhook_id: int, db: AsyncSession = Depends(get_db)):
    webhook = await crud.get_webhook(db=db, webhook_id=webhook_id)
    if not webhook or not webhook.enabled:
        raise HTTPException(400, "Webhook not found or disabled")

    payload = {
        "event": "test.trigger",
        "data": {"message": "This is a test from Acme Importer!"},
        "timestamp": asyncio.get_event_loop().time()
    }

    start = asyncio.get_event_loop().time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook.url, json=payload)
        elapsed = round((asyncio.get_event_loop().time() - start) * 1000)
        return {
            "status_code": response.status_code,
            "response_time_ms": elapsed,
            "success": response.status_code < 400
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to reach webhook: {str(e)}")


# ──────────────────────────────────────────────────────────────
# AUTO-TRIGGER WEBHOOKS WHEN PRODUCTS CHANGE
# ──────────────────────────────────────────────────────────────

async def trigger_webhooks(event: str, data: dict, db: AsyncSession):
    """Fire webhooks in background (non-blocking)"""
    webhooks = await crud.get_webhooks_by_event(db=db, event=event)
    if not webhooks:
        return

    payload = {
        "event": event,
        "data": data,
        "timestamp": asyncio.get_event_loop().time()
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = []
        for wh in webhooks:
            if wh.enabled:
                tasks.append(client.post(wh.url, json=payload))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)  # fire and forget


# Hook into product creation & update
from fastapi import BackgroundTasks

@app.post("/products/", response_model=ProductInDB)
async def create_product(
    product: ProductCreate,
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    try:
        db_product = await crud.create_product(db=db, obj_in=product)
        # Fire webhook in background
        background_tasks.add_task(
            trigger_webhooks,
            event="product.created",
            data={"id": db_product.id, "sku": db_product.sku, "name": db_product.name},
            db=db
        )
        return db_product
    except IntegrityError:
        await db.rollback()
        raise HTTPException(400, f"SKU '{product.sku}' already exists (case-insensitive)")
