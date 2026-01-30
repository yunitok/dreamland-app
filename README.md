# Dreamland Manager: Strategic Intelligence Platform

Dreamland Manager is a premium, AI-first management platform designed to transform raw project data into **strategic intelligence**. This application prioritizes executive-level decision-making by blending operational metrics with team wellness analysis.

![Dreamland App](/public/og-image.png)

## 🚀 Key Features

### 🧠 Strategic AI Advisor
- **Predictive Strategy Layer**: Unlike traditional dashboards, we forecast risks before they happen.
- **Contextual Insights**: Real-time analysis of project bottlenecks and opportunities.

### ❤️ Team Wellness (Pulse)
- **Sentiment Monitoring**: Tracks department-level emotional trends (e.g., "Resilient Stress", "Critical Frustration").
- **Holistic View**: Blends quantitative project delivery data with qualitative team health metrics.

### 🛡️ Role-Based Access Control (RBAC)
A robust, secure permission system designed for enterprise needs.
- **Granular Permissions**: Control access to specific resources (Projects, Users, Departments) and actions (View, Create, Edit, Delete).
- **Role Management**: Matrix-style permission editor for creating custom roles.
- **Default Roles**:
    - **Super Admin**: Full system access.
    - **Strategic PM**: Focus on roadmap and project execution.
    - **People & Culture Lead**: Manages team sentiment and departments.
    - **Stakeholder**: Read-only access to strategic insights.

### ⚙️ Admin Dashboard
- **Real-time Metrics**: Live counters for users, roles, and tracked entities.
- **User Management**: Full CRUD for system users.
- **Data Ingestion**: Tools to import external reports and datasets.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + Lucide React
- **Database**: Prisma ORM + SQLite (Portable & Fast)
- **Internationalization**: `next-intl` (English & Spanish support)
- **Security**: Custom session-based auth with `bcryptjs` encryption.

## 🏃 Getting Started

### 1. Prerequisites
- Node.js 18+
- npm or pnpm

### 2. Installation
```bash
# Install dependencies
npm install

# Setup Environment
cp .env.example .env
```

### 3. Database Setup
We use a seed script to populate the database with a robust initial state (Roles, permissions, and sample data).

```bash
# Reset database and run seeds
npm run db:reset
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## 🔐 Default Credentials

The seed script creates a default Super Administrator:

- **Username**: `admin`
- **Password**: `admin`

## 🌍 Localization

The app detects the user's locale automatically, but can be forced via URL (e.g., `/es/admin`, `/en/admin`).
- **Translation files**: Located in `/messages/es.json` and `/messages/en.json`.

---

*Dreamland Manager - Turning data into direction.*
