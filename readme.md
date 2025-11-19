# 🚀 Acme Products Importer

A production-ready, full-stack CSV Product Importer designed to efficiently handle 500,000+ product records. Built with FastAPI, Celery, PostgreSQL, and a modern React + TypeScript frontend.

![FastAPI](https://img.shields.io/badge/FastAPI-async--ready-green?logo=fastapi)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)
![Celery](https://img.shields.io/badge/Celery-5+-37814A?logo=celery)
![Docker](https://img.shields.io/badge/Docker-compose-blue?logo=docker)

---

## ✨ Features

| Feature                      | Status | Description                                   |
|-----------------------------|--------|-----------------------------------------------|
| Large CSV Import (500k+ rows)| ✅     | Non-blocking ingestion with Celery            |
| 3-Phase Progress Bar         | ✅     | Upload → Importing → Completed                |
| Inline Product Editing       | ✅     | Edit fields directly in the table             |
| Create/Edit Modal            | ✅     | Clean, Shopify-style modal                    |
| Webhook Management           | ✅     | CRUD + test button + auto-trigger             |
| Real-time Task Status        | ✅     | Celery + Redis integration                    |
| Case-insensitive SKU         | ✅     | Enforced using PostgreSQL CITEXT              |
| Docker + docker-compose      | ✅     | One-command local setup                       |

---

## 🛠 Tech Stack

**Backend:**
- FastAPI
- SQLAlchemy (async)
- PostgreSQL
- Alembic
- Celery
- Redis

**Frontend:**
- React (TypeScript, Vite)
- Ant Design (optional: for UI polish)

**DevOps:**
- Docker & Docker Compose

---

## 🚦 Quick Start (Docker)

```bash
git clone https://github.com/yourusername/csv-product-ingestion.git
cd csv-product-ingestion
docker-compose up --build
```
- Visit the frontend: [http://localhost:5173](http://localhost:5173)
- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🖥️ Local Development (without Docker)

1. **Backend**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env  # Edit DB/Redis URLs as needed
    alembic upgrade head
    uvicorn app.main:app --reload
    ```
2. **Frontend**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 📦 Usage
- Upload a CSV file with product data.
- Track progress in real time.
- Edit products inline or via modal.
- Manage webhooks: create, edit, delete, test.
- All operations are async and scalable.

---
