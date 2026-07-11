from pydantic import BaseModel, EmailStr, Field


class CheckoutRequest(BaseModel):
    email: EmailStr
    plan_code: str = Field(min_length=3, max_length=80)


class CheckoutResponse(BaseModel):
    order_id: str
    payment_url: str


class MidtransWebhookPayload(BaseModel):
    order_id: str
    status_code: str
    gross_amount: str
    signature_key: str
    transaction_status: str
    fraud_status: str | None = None
    payment_type: str | None = None
