from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=72)


class AccountSetupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    username: str = Field(min_length=3, max_length=48)
    password: str = Field(min_length=8, max_length=72)
    setup_token: str = Field(min_length=8, max_length=160)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    session_id: str


class AccountSetupResponse(BaseModel):
    status: str
