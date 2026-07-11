from hashlib import sha512
from uuid import uuid4

from app.core.config import get_settings
from app.schemas.payment import CheckoutRequest, CheckoutResponse, MidtransWebhookPayload


class PaymentService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def create_checkout(self, payload: CheckoutRequest) -> CheckoutResponse:
        order_id = f"ZNT-{uuid4().hex[:14].upper()}"

        # Midtrans Snap integration will replace this local setup URL.
        return CheckoutResponse(
            order_id=order_id,
            payment_url=(
                "http://localhost:3000/setup-account"
                f"?order_id={order_id}&email={payload.email}"
            ),
        )

    async def handle_webhook(self, payload: MidtransWebhookPayload) -> dict[str, str]:
        if not self._is_valid_signature(payload):
            raise ValueError("Invalid Midtrans signature")

        if payload.transaction_status in {"settlement", "capture"}:
            return {"status": "paid", "order_id": payload.order_id}

        if payload.transaction_status in {"deny", "cancel", "expire", "failure"}:
            return {"status": "failed", "order_id": payload.order_id}

        return {"status": "pending", "order_id": payload.order_id}

    def _is_valid_signature(self, payload: MidtransWebhookPayload) -> bool:
        signature_payload = (
            f"{payload.order_id}{payload.status_code}"
            f"{payload.gross_amount}{self.settings.midtrans_server_key}"
        )
        expected = sha512(signature_payload.encode("utf-8")).hexdigest()
        return expected == payload.signature_key
