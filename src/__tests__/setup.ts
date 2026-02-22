import 'dotenv/config'
import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'es',
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    project: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    task: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    taskList: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}))
