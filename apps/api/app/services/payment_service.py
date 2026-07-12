import uuid
from hashlib import sha512
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Payment
from app.schemas.payment import CheckoutRequest, CheckoutResponse, MidtransWebhookPayload


class PaymentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    async def create_checkout(self, payload: CheckoutRequest) -> CheckoutResponse:
        order_id = f"ZNT-{uuid4().hex[:14].upper()}"
        gross_amount = 150000.0  # Tarif premium bulanan IDR 150.000

        # Simpan record pembayaran pending ke database
        payment = Payment(
            order_id=order_id,
            email=payload.email,
            gross_amount=gross_amount,
            status="pending",
        )
        self.db.add(payment)
        await self.db.commit()

        # Cari IP atau hostname untuk URL setup-account
        # default ke localhost jika url config tidak terbaca
        base_url = "localhost"
        if self.settings.app_env != "local":
            raw_url = self.settings.database_url # just fallback or config lookup
            # Kita bisa mem-parsing config NEXT_PUBLIC_API_BASE_URL jika ada, 
            # tapi sederhananya kita gunakan redirect dinamis atau port 3001
            # Cari dari setting cors_origins yang berisi link frontend
            for origin in self.settings.cors_origins:
                if "localhost" not in origin and "127.0.0.1" not in origin:
                    base_url = origin.replace("http://", "").replace("https://", "").split(":")[0]
                    break

        if self.settings.app_env == "local":
            from sqlalchemy import delete
            await self.db.execute(delete(Payment).where(Payment.setup_token == "dev-token"))
            payment.setup_token = "dev-token"
            await self.db.commit()
            payment_url = (
                f"http://localhost:3000/setup-account"
                f"?order_id={order_id}&email={payload.email}&setup_token=dev-token"
            )
        else:
            token = uuid4().hex
            payment.setup_token = token
            await self.db.commit()
            # Gunakan port 3001 untuk frontend di VPS
            payment_url = (
                f"http://{base_url}:3001/setup-account"
                f"?order_id={order_id}&email={payload.email}&setup_token={token}"
            )

        return CheckoutResponse(
            order_id=order_id,
            payment_url=payment_url,
        )

    async def get_payment_status(self, order_id: str) -> dict[str, str]:
        query = select(Payment).where(Payment.order_id == order_id)
        result = await self.db.execute(query)
        payment = result.scalar_one_or_none()

        if not payment:
            raise ValueError("Payment not found")

        return {
            "order_id": payment.order_id,
            "status": payment.status,
            "email": payment.email,
            "setup_token": payment.setup_token if (payment.status == "paid" and not payment.setup_token_used) else ""
        }

    async def handle_webhook(self, payload: MidtransWebhookPayload) -> dict[str, str]:
        if not self._is_valid_signature(payload):
            raise ValueError("Invalid Midtrans signature")

        query = select(Payment).where(Payment.order_id == payload.order_id)
        result = await self.db.execute(query)
        payment = result.scalar_one_or_none()

        if not payment:
            raise ValueError(f"Order ID {payload.order_id} not found in database")

        transaction_status = payload.transaction_status

        if transaction_status in {"settlement", "capture"}:
            payment.status = "paid"
            if not payment.setup_token:
                payment.setup_token = uuid4().hex
                payment.setup_token_used = False
        elif transaction_status in {"deny", "cancel", "expire", "failure"}:
            payment.status = "failed"
        else:
            payment.status = "pending"

        await self.db.commit()
        return {"status": payment.status, "order_id": payment.order_id}

    def _is_valid_signature(self, payload: MidtransWebhookPayload) -> bool:
        if self.settings.midtrans_server_key == "change-this" or self.settings.app_env == "local":
            return True

        signature_payload = (
            f"{payload.order_id}{payload.status_code}"
            f"{payload.gross_amount}{self.settings.midtrans_server_key}"
        )
        expected = sha512(signature_payload.encode("utf-8")).hexdigest()
        return expected == payload.signature_key
