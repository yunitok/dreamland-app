---
title: Deployment Guide
description: Production deployment instructions for Vercel, Railway, and AWS
---

# Deployment Guide - Dreamland Manager

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Groq and/or Gemini API keys

---

## Environment Variables

Create `.env` file in production:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# AI Provider
AI_PROVIDER="groq"  # or "gemini"
GROQ_API_KEY="gsk_..."
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."

# Security (generate secure secrets)
JWT_SECRET="your-super-secret-jwt-key-here"
```

---

## Deployment Steps

### 1. Install Dependencies

```bash
npm install --production
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Run Migrations

```bash
npx prisma migrate deploy
```

###4. Run Seed (First Deploy Only)

```bash
npx tsx prisma/seed.ts
```

### 5. Build Application

```bash
npm run build
```

### 6. Start Production Server

```bash
npm start
```

---

## Platform-Specific Guides

### Vercel (Recommended)

1. Connect GitHub repository
2. Set environment variables in dashboard
3. Build command: `npm run build`
4. Deploy automatically on push

### Railway

1. Create new project from GitHub
2. Add PostgreSQL database service
3. Set environment variables
4. Deploy

---

## Post-Deployment

### Change Default Password

```sql
UPDATE "User" SET password = '...' WHERE username = 'admin';
```

### Monitor AI Usage

Check quotas regularly to avoid service interruptions.

---

## Further Reading

- [Environment Variables](./environment-variables.md)
- [System Overview](../architecture/system-overview.md)
