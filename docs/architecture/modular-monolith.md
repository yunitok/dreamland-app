# Modular Monolith Architecture - Dreamland Manager

## Overview

Dreamland Manager has evolved from a traditional Layered Architecture to a **Modular Monolith**. This architectural style structures the application into self-contained modules based on business domains, rather than technical layers (controllers, services, repositories).

This approach, often referred to as "Screaming Architecture", ensures that the top-level directory structure communicates *what the system does* (Projects, Tasks, Reports) rather than *what framework it uses* (MVC, etc.).

## Directory Structure (`src/modules`)

All business logic is encapsulated within `src/modules`. Each module functions as a mini-application with its own internal layering.

```
src/modules/
├── admin/              # User Management, RBAC, System Settings
├── departments/        # Department entities and logic
├── projects/           # Core Project Management (Tasks, Lists, Tags)
├── reports/            # Generative AI Reports & Analysis
├── sentiment/          # Team Wellness & Sentiment Analysis
├── shared/             # Shared Kernel (Utilities used across modules)
└── sherlock/           # [New] AI Investigation Module
```

## Module Anatomy

Each module follows a consistent internal structure to ensure isolation and maintainability:

```
src/modules/[module-name]/
├── actions/      # Public API (Server Actions) exposed to the UI/Client
├── components/   # Module-specific React components
├── domain/       # Core business logic, entities, and types
├── ui/           # Complex UI assemblages or pages specific to the module
└── utils/        # Internal helpers
```

### Key Principles

1.  **Public Interface**: Modules should only communicate through their public API (typically `actions/` or exported service functions). Direct database access across module boundaries is discouraged.
2.  **Shared Kernel**: Common utilities, base types, and highly reusable UI components reside in `src/modules/shared`.
3.  **Co-location**: Code that changes together stays together. A feature's UI, logic, and data access are kept in close proximity.

## Benefits

-   **Scalability**: Easier to split into microservices in the future if needed.
-   **Maintainability**: Changes to one module (e.g., `projects`) are less likely to break unrelated features (e.g., `admin`).
-   **Cognitive Load**: Developers can focus on a single module without needing to understand the entire system.
