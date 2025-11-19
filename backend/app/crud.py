from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from .models import Product, Webhook
from .schemas import ProductCreate, WebhookCreate

async def create_product(db: AsyncSession, obj_in: ProductCreate) -> Product:
    """
    Create a new product in the database.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
        obj_in (ProductCreate): Product creation schema with product details.

    Returns:
        Product: The created Product instance.
    """
    db_obj = Product(
        sku=obj_in.sku,
        name=obj_in.name,
        description=obj_in.description,
        is_active=obj_in.is_active
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_products(db: AsyncSession, skip: int = 0, limit: int = 100, sku: str = None, active: bool = None):
    """
    Retrieve a list of products from the database, with optional filtering.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
        skip (int, optional): Number of records to skip for pagination. Defaults to 0.
        limit (int, optional): Maximum number of records to return. Defaults to 100.
        sku (str, optional): SKU to filter products. Defaults to None.
        active (bool, optional): Filter by active status. Defaults to None.

    Returns:
        List[Product]: List of Product instances.
    """
    query = select(Product)
    if sku:
        query = query.where(Product.sku == sku)
    if active is not None:
        query = query.where(Product.is_active == active)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def remove_all_products(db: AsyncSession):
    """
    Remove all products from the database.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
    """
    await db.execute(delete(Product))
    await db.commit()


async def create_webhook(db: AsyncSession, obj_in: WebhookCreate):
    """
    Create a new webhook in the database.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
        obj_in (WebhookCreate): Webhook creation schema with webhook details.

    Returns:
        Webhook: The created Webhook instance.
    """
    data = obj_in.dict()
    data['url'] = str(data['url'])  # Ensure url is a string
    db_obj = Webhook(**data)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_webhooks(db: AsyncSession):
    """
    Retrieve all webhooks from the database.

    Args:
        db (AsyncSession): SQLAlchemy async database session.

    Returns:
        List[Webhook]: List of Webhook instances.
    """
    result = await db.execute(select(Webhook))
    return result.scalars().all()

async def get_webhook(db: AsyncSession, webhook_id: int):
    """
    Retrieve a single webhook by its ID.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
        webhook_id (int): The ID of the webhook to retrieve.

    Returns:
        Webhook or None: The Webhook instance if found, else None.
    """
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    return result.scalar_one_or_none()

async def get_webhooks_by_event(db: AsyncSession, event: str):
    """
    Retrieve all webhooks that listen to a specific event.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
        event (str): The event to filter webhooks by.

    Returns:
        List[Webhook]: List of Webhook instances.
    """
    result = await db.execute(select(Webhook).where(Webhook.events.contains(event)))
    return result.scalars().all()

async def update_webhook(db: AsyncSession, webhook_id: int, obj_in: WebhookCreate):
    """
    Update an existing webhook with new data.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
        webhook_id (int): The ID of the webhook to update.
        obj_in (WebhookCreate): Webhook creation schema with updated details.

    Returns:
        Webhook or None: The updated Webhook instance if found, else None.
    """
    webhook = await get_webhook(db, webhook_id)
    if not webhook:
        return None
    data = obj_in.dict()
    data['url'] = str(data['url'])  # Ensure url is a string
    for key, value in data.items():
        setattr(webhook, key, value)
    await db.commit()
    await db.refresh(webhook)
    return webhook

async def delete_webhook(db: AsyncSession, webhook_id: int):
    """
    Delete a webhook by its ID.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
        webhook_id (int): The ID of the webhook to delete.

    Returns:
        bool: True if deleted, False if not found.
    """
    webhook = await get_webhook(db, webhook_id)
    if not webhook:
        return False
    await db.delete(webhook)
    await db.commit()
    return True