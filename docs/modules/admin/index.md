---
title: Admin Module
description: User management, RBAC, and system settings
---

# Admin Module - Dreamland Manager

## Overview

The **Admin Module** provides the necessary tools for system administrators to manage users, permissions, and organizational structure. It serves as the control center for Dreamland Manager's security and configuration.

## Features

### 1. User Management (Identity)
Located in `src/modules/admin/ui/identity`, this feature allows admins to:
-   **List Users**: View all registered users with pagination and search.
-   **Edit Users**: Update user details, including name and email.
-   **Role Assignment**: Assign implementation roles (Admin, Manager, Member) to users within the RBAC system.
-   **Deactivate Users**: Soft-delete or ban users from accessing the system.

### 2. Role-Based Access Control (RBAC)
The core security mechanism is managed here.
-   **Roles**: Defined in `src/modules/admin/actions/identity-roles.ts`.
-   **Permissions**: Granular permissions are mapped to roles, controlling access to specific resources (e.g., `projects:delete`, `reports:create`).

### 3. Department Management
Manage the organizational hierarchy.
-   Create and edit departments (e.g., "Engineering", "Design", "Marketing").
-   Assign users to departments for sentiment analysis grouping.

### 4. Procesos Automáticos
Panel centralizado para ejecutar, monitorizar y programar tareas recurrentes.
- **Dashboard**: Vista general de todos los procesos con su último estado de ejecución.
- **Ejecución manual**: Disparar cualquier proceso interno directamente desde la UI.
- **Cron automático**: Procesos programados via Vercel Cron (sincronización, limpieza, alertas).
- **Tracking**: Cada ejecución queda registrada con status, duración, output y errores.

Para más detalle, ver [Procesos Automáticos](./processes).

## Technical Implementation

-   **Server Actions**: modifications are performed via secure Server Actions in `src/modules/admin/actions`.
-   **Security**: All admin actions are protected by strict `verifySession()` checks and an additional `role: 'admin' | 'super-admin'` guard.
-   **UI Components**: Uses a dedicated layout with a sidebar for admin-specific navigation.
-   **Process Runner**: Framework de ejecución con tracking en `src/lib/process-runner.ts`. Automatización programada via Vercel Cron.

## Usage

Access the admin panel via `/admin`.
*Note: This route is strictly protected and will redirect unauthorized users to the dashboard.*
