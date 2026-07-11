from fastapi import APIRouter, HTTPException, status

from app.schemas.payment import CheckoutRequest, CheckoutResponse, MidtransWebhookPayload
from app.services.payment_service import PaymentService

router = APIRouter()


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(payload: CheckoutRequest) -> CheckoutResponse:
    service = PaymentService()
    return await service.create_checkout(payload)


@router.post("/midtrans/webhook")
async def midtrans_webhook(payload: MidtransWebhookPayload) -> dict[str, str]:
    service = PaymentService()

    try:
        return await service.handle_webhook(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
