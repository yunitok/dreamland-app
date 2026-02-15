---
title: Authentication & User Management
description: Secure credential-based login, session management, and role-based access control
---

# Authentication & User Management

## Overview

Dreamland Manager uses a robust authentication system built on top of **NextAuth.js** (v5) and **Prisma**. It supports secure credential-based login, session management, and role-based access control (RBAC).

---

## Security Features

### 1. Forced Password Change
To enhance security, administrators can flag users to require a password change upon their next login.

- **Mechanism**: A `mustChangePassword` boolean flag in the `User` database model.
- **Flow**:
    1. User logs in with temporary credentials.
    2. System checks `mustChangePassword` flag.
    3. If `true`, middleware redirects user strictly to `/change-password`.
    4. User cannot access any other route until the password is updated.
    5. Upon successful update, the flag is set to `false` and the user is redirected to the dashboard.

### 2. "Remember Me"
Users can opt to keep their session active for an extended period.

- **Standard Session**: 24 hours.
- **"Remember Me" Session**: 30 days.
- **Implementation**: The login form passes a `remember` flag to the backend, which adjusts the session cookie's `expires` attribute accordingly.

### 3. Password Hashing
All passwords are securely hashed using **bcryptjs** with a cost factor of 10 before storage.

---

## User Management

### Bulk User Import
A utility script is available to bulk import users from a JSON file, suitable for initializing the system with data from external sources (e.g., NotebookLM exports).

**Script Location**: `scripts/import-users.ts`

**Input Format**:
The script expects a JSON file (default: `data/users.json`) with the following structure:

```json
[
  {
    "username": "jdoe",
    "email": "jdoe@example.com",
    "name": "John Doe",
    "role": "STRATEGIC_PM" 
  },
  // ... more users
]
```

**Features**:
- **Automatic Password Generation**: All imported users are assigned a default password (e.g., `dreamland2026`).
- **Forced Reset**: The `mustChangePassword` flag is automatically set to `true` for all imported users.
- **Role Assignment**: Assigns the specified role code. If the role doesn't exist, it defaults to a `BASIC_USER` role (which is created if missing).
- **Idempotency**: Skips users that already exist (by username or email).

**Running the Import**:
```bash
# Ensure typescript-node execution is set up (e.g. via tsx)
npx tsx scripts/import-users.ts
```

---

## Internationalization (i18n)

All authentication-related screens are fully localized in:
- English (`en`)
- Spanish (`es`)
- French (`fr`)
- German (`de`)
- Italian (`it`)
- Russian (`ru`)

This includes:
- Login Form
- Change Password Form
- Error Messages (e.g., "Invalid credentials", "Password too short")

See [Internationalization Guide](./internationalization.md) for more details.
