from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.schemas.payment import CheckoutRequest, CheckoutResponse, MidtransWebhookPayload
from app.services.payment_service import PaymentService

router = APIRouter()


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    payload: CheckoutRequest,
    db: AsyncSession = Depends(get_db_session),
) -> CheckoutResponse:
    service = PaymentService(db)
    return await service.create_checkout(payload)


@router.get("/status/{order_id}")
async def get_status(
    order_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    service = PaymentService(db)
    try:
        return await service.get_payment_status(order_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/midtrans/webhook")
async def midtrans_webhook(
    payload: MidtransWebhookPayload,
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    service = PaymentService(db)

    try:
        return await service.handle_webhook(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
