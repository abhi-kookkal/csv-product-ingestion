# app/tasks.py
import csv
import os
from celery import Celery

# SYNC ONLY — NO ASYNC, NO ASYNCPG, NO COROUTINES
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# SYNC DATABASE URL (no +asyncpg!)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5435/csv_product")

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
# app/tasks.py — FINAL VERSION (copy-paste)
@celery_app.task(bind=True)
def process_csv_import(self, file_path: str):
    # Count total rows
    with open(file_path, 'r', encoding='utf-8') as f:
        total = sum(1 for _ in csv.DictReader(f))
    
    self.update_state(state='PROGRESS', meta={'progress': 0, 'current': 0, 'total': total, 'status': 'Starting...'})

    session = SessionLocal()
    imported = 0

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                sku = (row.get('SKU') or row.get('sku') or '').strip()
                if not sku:
                    continue

                name = (row.get('Name') or row.get('name') or '').strip()
                desc = row.get('Description') or row.get('description') or ''

                session.execute(text("""
                    INSERT INTO products (sku, name, description, is_active)
                    VALUES (:sku, :name, :desc, true)
                    ON CONFLICT (sku) DO UPDATE 
                    SET name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        is_active = true
                """), {"sku": sku, "name": name, "desc": desc})

                imported += 1

                # Update progress every 5,000 rows
                if imported % 5000 == 0 or imported == total:
                    progress = round((imported / total) * 100, 1)
                    session.commit()
                    self.update_state(state='PROGRESS', meta={
                        'progress': progress,
                        'current': imported,
                        'total': total,
                        'status': f'Imported {imported}/{total} products...'
                    })

        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()
        os.remove(file_path)

    return {"imported": imported, "status": "success"}