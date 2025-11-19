from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.dialects.postgresql import CITEXT  # Case-insensitive + unique
from .database import Base
from sqlalchemy.dialects.postgresql import ARRAY

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(CITEXT, unique=True, index=True)  # Case-insensitive unique SKU
    name = Column(String(256), nullable=False)
    description = Text()
    is_active = Column(Boolean, default=True, server_default="true")

class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(Integer, primary_key=True)
    url = Column(String(512), nullable=False)
    events = Column(ARRAY(String), default=["product.created", "product.updated"])  # or JSON
    enabled = Column(Boolean, default=True)
    last_status = Column(String(20))
    last_response = Column(Text)