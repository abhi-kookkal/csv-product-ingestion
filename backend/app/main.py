from typing import List, Optional

import asyncio
import os
import tempfile
import uuid

import httpx
from fastapi import (
    BackgroundTasks,
    BackgroundTasks as BGTasksAlias,  # keep explicit type if you prefer
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    Response,
    Status,
    UploadFile,
)
from fastapi.responses import JSONResponse
import fastapi.middleware.cors
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from . import crud, models, schemas, tasks
from .database import get_db
from .schemas import ProductCreate, ProductInDB
from .tasks import process_csv_import

# Application
app = FastAPI(title="Acme Products Importer")

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------
def _save_upload_to_tempfile(contents: bytes, suffix: str = ".csv") -> str:
    """Save bytes to a temp file and return path."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(contents)
        tmp.flush()
        return tmp.name
    finally:
        tmp.close()


# ---------- CSV upload / task endpoints ----------
@app.post("/upload-csv/", status_code=202)
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be CSV")

    contents = await file.read()
    file_path = _save_upload_to_tempfile(contents, suffix=".csv")

    # Fire & forget Celery task – returns immediately
    result = process_csv_import.delay(file_path)

    return {"task_id": result.id, "status": "File uploaded – processing started"}


@app.get("/tasks/{task_id}/status")
def get_task_status(task_id: str):
    # Use the task proxy's AsyncResult
    task = process_csv_import.AsyncResult(task_id)
    if task.state == "PENDING":
        response = {"state": task.state, "progress": 0}
    elif task.state != "FAILURE":
        info = task.info or {}
        response = {
            "state": task.state,
            "progress": info.get("progress", 0),
            "current": info.get("current", 0),
            "total": info.get("total", None),
        }
    else:
        # task.info may be None or an exception object
        info = task.info or {}
        response = {"state": task.state, "error": str(info.get("exc_info") or info)}

    return response


# ---------- CRUD: Products ----------
@app.post("/products/", response_model=ProductInDB)
async def create_product(
    product: ProductCreate,
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    """
    Create a product and (in the background) fire product.created webhooks.
    IntegrityError handling keeps the original behavior.
    """
    try:
        db_product = await crud.create_product(db=db, obj_in=product)

        # Fire webhook in background
        if background_tasks is not None:
            background_tasks.add_task(
                # trigger_webhooks expects (event: str, data: dict, db: AsyncSession)
                # we pass the db session instance — crud functions should be able to use it
                trigger_webhooks,
                "product.created",
                {"id": db_product.id, "sku": db_product.sku, "name": db_product.name},
                db,
            )
        return db_product
    except IntegrityError:
        await db.rollback()
        # preserve the original error message used earlier
        raise HTTPException(status_code=400, detail=f"SKU '{product.sku}' already exists (case-insensitive)")


@app.get("/products/")
async def read_products(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    sku: Optional[str] = Query(default=None),
    active: Optional[bool] = None,
):
    products = await crud.get_products(db, skip=skip, limit=limit, sku=sku, active=active)
    return products


@app.delete("/products/all", status_code=204)
async def delete_all_products(db: AsyncSession = Depends(get_db)):
    await crud.remove_all_products(db=db)
    return Response(status_code=204)


# ---------- Webhooks CRUD + test ----------
from .models import Webhook
from .schemas import WebhookCreate, WebhookInDB

@app.post("/webhooks/", response_model=WebhookInDB)
async def create_webhook(webhook: WebhookCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_webhook(db=db, obj_in=webhook)


@app.get("/webhooks/", response_model=List[WebhookInDB])
async def get_webhooks(db: AsyncSession = Depends(get_db)):
    return await crud.get_webhooks(db=db)


@app.put("/webhooks/{webhook_id}", response_model=WebhookInDB)
async def update_webhook(
    webhook_id: int, webhook_in: WebhookCreate, db: AsyncSession = Depends(get_db)
):
    webhook = await crud.update_webhook(db=db, webhook_id=webhook_id, obj_in=webhook_in)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return webhook


@app.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: int, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_webhook(db=db, webhook_id=webhook_id)
    if not success:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"detail": "Webhook deleted"}


@app.post("/webhooks/{webhook_id}/test")
async def test_webhook_endpoint(webhook_id: int, db: AsyncSession = Depends(get_db)):
    webhook = await crud.get_webhook(db=db, webhook_id=webhook_id)
    if not webhook or not webhook.enabled:
        raise HTTPException(status_code=400, detail="Webhook not found or disabled")

    payload = {
        "event": "test.trigger",
        "data": {"message": "This is a test from Acme Importer!"},
        "timestamp": asyncio.get_event_loop().time(),
    }

    start = asyncio.get_event_loop().time()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook.url, json=payload)
        elapsed = round((asyncio.get_event_loop().time() - start) * 1000)
        return {
            "status_code": response.status_code,
            "response_time_ms": elapsed,
            "success": response.status_code < 400,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reach webhook: {str(e)}")


# ---------- AUTO-TRIGGER WEBHOOKS WHEN PRODUCTS CHANGE ----------
async def trigger_webhooks(event: str, data: dict, db: AsyncSession):
    """Fire webhooks in background (non-blocking)"""
    webhooks = await crud.get_webhooks_by_event(db=db, event=event)
    if not webhooks:
        return

    payload = {
        "event": event,
        "data": data,
        "timestamp": asyncio.get_event_loop().time(),
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = []
        for wh in webhooks:
            if wh.enabled:
                tasks.append(client.post(wh.url, json=payload))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
