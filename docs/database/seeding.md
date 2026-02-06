# Database Seeding - Dreamland Manager

## Overview

Dreamland Manager uses comprehensive seed scripts to populate the database with initial data, including default roles, permissions, and sample content.

---

## Seed Scripts

### 1. Main Seed (`seed.ts`)

**File**: `prisma/seed.ts`

The primary seed script that creates:
- 4 default roles (Super Admin, Strategic PM, People Lead, Stakeholder)
- 24 permissions (resource + action combinations)
- 1 admin user (username: `admin`, password: `admin`)
- Sample projects, tasks, and sentiment data

**Usage**:
```bash
npm run db:seed
```

---

### 2. Pilot Seed (`seed-pilot.ts`)

**File**: `prisma/seed-pilot.ts`

A lighter seed script for testing that creates:
- Core roles and permissions only
- Admin user
- NO sample data

**Usage**:
```bash
npx tsx prisma/seed-pilot.ts
```

---

## Data Created

### Roles & Permissions

#### Super Admin Role
```typescript
{
  code: 'SUPER_ADMIN',
  name: 'Super Admin',
  description: 'Full system access',
  isSystem: true,
  permissions: [
    { action: 'view', resource: 'projects' },
    { action: 'create', resource: 'projects' },
    { action: 'edit', resource: 'projects' },
    { action: 'delete', resource: 'projects' },
    // ... (24 total permissions)
  ]
}
```

#### Strategic PM Role
```typescript
{
  code: 'STRATEGIC_PM',
  name: 'Strategic PM',
  description: 'Project and roadmap management',
  isSystem: true,
  permissions: [
    { action: 'view', resource: 'projects' },
    { action: 'create', resource: 'projects' },
    { action: 'edit', resource: 'projects' },
    { action: 'view', resource: 'tasks' },
    // ... (12 total permissions)
  ]
}
```

#### People & Culture Lead Role
```typescript
{
  code: 'PEOPLE_CULTURE_LEAD',
  name: 'People & Culture Lead',
  description: 'Team wellness and departments',
  isSystem: true,
  permissions: [
    { action: 'view', resource: 'sentiment' },
    { action: 'create', resource: 'sentiment' },
    { action: 'edit', resource: 'sentiment' },
    { action: 'view', resource: 'departments' },
    // ... (10 total permissions)
  ]
}
```

#### Stakeholder Role
```typescript
{
  code: 'STAKEHOLDER',
  name: 'Stakeholder',
  description: 'Read-only strategic insights',
  isSystem: true,
  permissions: [
    { action: 'view', resource: 'projects' },
    { action: 'view', resource: 'tasks' },
    { action: 'view', resource: 'sentiment' },
    { action: 'view', resource: 'departments' }
  ]
}
```

---

### Default Admin User

```typescript
{
  username: 'admin',
  password: 'admin',  // Hashed with bcryptjs
  name: 'System Administrator',
  email: 'admin@dreamland.com',
  role: 'SUPER_ADMIN'
}
```

> [!WARNING]
> **Change the default password** immediately in production!

---

### Sample Data (Main Seed Only)

#### Projects
```typescript
[
  {
    title: 'Mobile App Redesign',
    department: 'Engineering',
    type: 'Initiative',
    priority: 'High',
    status: 'Active',
    description: 'Complete redesign of mobile application',
    progress: 45
  },
  {
    title: 'Customer Retention Strategy',
    department: 'Marketing',
    type: 'Problem',
    priority: 'High',
    status: 'Pending',
    description: 'Address declining retention rates',
    progress: 0
  }
]
```

#### Task Lists & Tasks
Each project gets 3 lists:
- **Backlog**: Initial tasks awaiting prioritization
- **In Progress**: Active development tasks
- **Done**: Completed tasks

Sample tasks include:
- "Research competitor apps"
- "Create wireframes"
- "Implement authentication"
- "Write unit tests"

#### Team Mood Data
```typescript
[
  {
    departmentName: 'Engineering',
    sentimentScore: 75,
    dominantEmotion: 'Resilient',
    keyConcerns: 'High workload but motivated'
  },
  {
    departmentName: 'Marketing',
    sentimentScore: 60,
    dominantEmotion: 'Cautious',
    keyConcerns: 'Uncertain about Q2 goals'
  }
]
```

---

## Running Seeds

### Development

Reset database and re-seed:
```bash
npm run db:reset
```

This command:
1. Drops all tables
2. Recreates schema via Prisma migration
3. Runs `seed.ts`

### Production

**Never use `db:reset` in production!** Instead:

```bash
# Only run seed if database is empty
npx tsx prisma/seed.ts
```

---

## Customizing Seeds

### Adding Custom Roles

Edit `prisma/seed.ts`:

```typescript
// Add after existing roles
const developerRole = await prisma.role.create({
  data: {
    code: 'DEVELOPER',
    name: 'Developer',
    description: 'Software engineers with technical access',
    permissions: {
      connect: [
        await getPermission('view', 'projects'),
        await getPermission('view', 'tasks'),
        await getPermission('create', 'tasks'),
        await getPermission('edit', 'tasks')
      ]
    }
  }
});
```

### Adding Sample Projects

```typescript
const customProject = await prisma.project.create({
  data: {
    title: 'AI Integration',
    department: 'Engineering',
    type: 'Initiative',
    priority: 'High',
    status: 'Active',
    description: 'Integrate AI capabilities into the platform',
    progress: 0,
    lists: {
      create: [
        {
          name: 'Backlog',
          position: 0,
          tasks: {
            create: [
              {
                title: 'Research AI providers',
                status: { connect: { name: 'To Do' } }
              }
            ]
          }
        }
      ]
    }
  }
});
```

---

## Helper Functions

### getPermission

Finds or creates a permission:

```typescript
async function getPermission(action: string, resource: string) {
  return await prisma.permission.upsert({
    where: {
      action_resource: { action, resource }
    },
    create: { action, resource },
    update: {}
  });
}
```

### hashPassword

Securely hashes passwords:

```typescript
import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
```

---

## Troubleshooting

### "Unique constraint failed"

**Cause**: Running seed multiple times without resetting.

**Solution**: Use `npm run db:reset` instead of `npm run db:seed`.

---

### Seed hangs indefinitely

**Cause**: Missing required fields or circular dependencies.

**Solution**: Check console for errors and verify schema matches seed data.

---

### "User already exists"

**Cause**: Admin user already in database.

**Solution**: Either:
1. Reset database: `npm run db:reset`
2. Skip user creation in seed script

---

## Further Reading

- [Data Model](./data-model.md)
- [Maintenance Scripts](./maintenance-scripts.md)
- [RBAC System](../features/rbac/overview.md)
