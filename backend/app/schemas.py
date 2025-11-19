from pydantic import BaseModel, HttpUrl
from typing import Optional, List

class WebhookBase(BaseModel):
    url: HttpUrl
    events: List[str]
    enabled: bool = True

class WebhookCreate(WebhookBase):
    pass

class WebhookInDB(WebhookBase):
    id: int

    class Config:
        orm_mode = True

class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductInDB(ProductBase):
    id: int

    class Config:
        orm_mode = True
