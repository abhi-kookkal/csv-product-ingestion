# app/tasks.py
import csv
import os
from celery import Celery

# SYNC ONLY — NO ASYNC, NO ASYNCPG, NO COROUTINES
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# SYNC DATABASE URL (no +asyncpg!)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/csv_product")

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)
SessionLocal = sessionmaker(bind=engine)

celery_app = Celery("importer")
celery_app.conf.broker_url = "redis://localhost:6379/0"
celery_app.conf.result_backend = "redis://localhost:6379/1"
celery_app.conf.task_acks_late = True
celery_app.conf.worker_prefetch_multiplier = 1
celery_app.conf.broker_connection_retry_on_startup = True  # removes warning

import asyncio

@celery_app.task(bind=True, name="process_csv_import")
def process_csv_import(self, file_path: str):
    return asyncio.run(_process_csv_import(self, file_path))

async def _process_csv_import(self, file_path: str):
    # Count total rows
    with open(file_path, encoding="utf-8") as f:
        total = sum(1 for _ in csv.DictReader(f))
    print(total)
    self.update_state(state="PROGRESS", meta={"progress": 0, "current": 0, "total": total})
    print("Progress updated")
    imported = 0
    session = SessionLocal()

    try:
        with open(file_path, newline="", encoding="utf-8") as f:
            print("File opened")
            reader = csv.DictReader(f)
            for row in reader:
                print("Row read")
                sku = (row.get("SKU") or row.get("sku") or row.get("Sku") or "").strip()
                if not sku:
                    continue
                print("SKU found")
                name = (row.get("Name") or row.get("name") or "").strip()
                desc = row.get("Description") or row.get("description") or ""
                print("Name and description found")

                session.execute(
                    text("""
                        INSERT INTO products (sku, name, description, is_active)
                        VALUES (:sku, :name, :desc, true)
                        ON CONFLICT (sku) DO UPDATE
                        SET name = EXCLUDED.name,
                            description = EXCLUDED.description,
                            is_active = true
                    """),
                    {"sku": sku, "name": name, "desc": desc}
                )
                print("Product inserted")
                imported += 1
                print("Imported count updated")

                # Update progress every 5,000 rows
                if imported % 5000 == 0:
                    session.commit()
                    progress = round((imported / total) * 100, 1)
                    self.update_state(
                        state="PROGRESS",
                        meta={"progress": progress, "current": imported, "total": total}
                    )
                    print("Progress updated")
            session.commit()
            print("Session committed")
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()
        try:
            os.remove(file_path)
        except:
            pass

    return {"status": "completed", "imported_rows": imported}