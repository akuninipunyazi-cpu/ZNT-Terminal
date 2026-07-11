# Payment And Account Flow

## Target Flow

```txt
Visitor opens link
  -> login page
  -> checkout if no account
  -> Midtrans payment
  -> Midtrans webhook confirms payment
  -> backend creates setup token
  -> user fills name, email, username, password
  -> user logs in
  -> terminal opens
```

## Source Of Truth

The backend must trust Midtrans webhook validation, not frontend redirect status. Frontend redirects are only user experience.

## Account Setup

The setup token should be single-use, short-lived, and tied to a paid order. The password is hashed with bcrypt before persistence.

## Session Policy

One user can have only one active session. A new login revokes the previous session.
