# Dreamland Manager

> **Strategic Intelligence Platform** - Transform raw project data into actionable insights with AI-powered decision support.

![Dreamland App](/public/og-image.png)

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-Private-red)]()

---

## ✨ What is Dreamland Manager?

Dreamland Manager is a **premium, AI-first management platform** designed for strategic decision-making. Unlike traditional project management tools, it combines:

- 📊 **Real-time project tracking** with predictive risk analysis
- ❤️ **Team wellness monitoring** to identify burnout before it happens
- 🎙️ **Voice-powered AI assistant** for hands-free task management
- 🛡️ **Enterprise-grade RBAC** with granular permissions

---

## 🚀 Key Features

### 🧠 AI-Powered Voice Assistant
Manage your projects through natural language commands:
- "Create task: Fix login bug" → Task created instantly
- "Show my high-priority tasks" → Filtered list displayed
- Supports **English** and **Spanish** with 30+ commands

[📖 Full Voice Commands Reference →](./docs/guides/voice-commands.md)

### ❤️ Team Wellness Analytics
Monitor team sentiment across departments:
- Department-level emotional trend tracking
- Early warning system for team burnout
- Holistic view combining delivery metrics + team health

### 🛡️ Role-Based Access Control
Enterprise-grade security with 4 default roles:
- **Super Admin** - Full system access
- **Strategic PM** - Project and roadmap management
- **People & Culture Lead** - Team wellness focus
- **Stakeholder** - Read-only insights

[📖 RBAC Documentation →](./docs/features/rbac/overview.md)

### 🌍 Internationalization
Built-in support for multiple languages:
- English and Spanish included
- Easy to add new languages
- Automatic locale detection

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) + React 19 |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL + Prisma ORM |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **AI** | Groq (Llama 3.3 70B) / Google Gemini |
| **Auth** | Custom session-based (bcryptjs) |
| **i18n** | next-intl |

[📖 Full Architecture Overview →](./docs/architecture/system-overview.md)

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (or SQLite for local development)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd dreamland-app

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your database URL and AI API keys

# 4. Initialize database
npm run db:reset

# 5. Start development server
npm run dev
```

🎉 Open [http://localhost:3000](http://localhost:3000) and login with:
- **Username**: `admin`
- **Password**: `admin`

> [!WARNING]
> Change the default password immediately in production!

---

## 📚 Documentation

Comprehensive technical documentation is available in the [`/docs`](./docs) directory:

### Getting Started
- [📖 Documentation Index](./docs/README.md) - Start here for complete guide
- [🚀 Deployment Guide](./docs/guides/deployment.md) - Production setup
- [🎙️ Voice Commands](./docs/guides/voice-commands.md) - Command reference (EN/ES)

### Technical Deep Dives
- [🏗️ System Architecture](./docs/architecture/system-overview.md) - Design decisions and data flow
- [🗄️ Database Model](./docs/database/data-model.md) - Complete schema with ER diagrams
- [🤖 Voice Assistant](./docs/features/voice-assistant/architecture.md) - Provider pattern and AI integration
- [🔐 RBAC System](./docs/features/rbac/overview.md) - Role and permission management
- [🌐 Internationalization](./docs/features/internationalization.md) - Multi-language support

---

## 🎙️ AI Configuration

Dreamland supports two AI providers via a flexible **Provider Pattern**:

```bash
# .env
AI_PROVIDER="groq"  # or "gemini"

# API Keys (get from providers)
GROQ_API_KEY="gsk_..."
GOOGLE_GENERATIVE_AI_API_KEY="AIza..."
```

| Provider | Speed | Free Tier | Best For |
|----------|-------|-----------|----------|
| **Groq** (Recommended) | ⚡ 1-2s | 14,400 req/day | Production |
| **Gemini** | 🐌 2-4s | 1,500 req/day | Fallback |

[📖 Detailed AI Setup →](./docs/features/voice-assistant/architecture.md)

---

## 🌍 Supported Languages

- 🇬🇧 English
- 🇪🇸 Spanish

Adding more languages is as simple as creating a new JSON file in `/messages`.

[📖 i18n Guide →](./docs/features/internationalization.md)

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./docs/CONTRIBUTING.md) (coming soon).

---

## 📝 License

Private project - All rights reserved.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Groq](https://groq.com/) - AI inference
- [Google Gemini](https://ai.google.dev/) - AI fallback

---

*Dreamland Manager - Turning data into direction.*
