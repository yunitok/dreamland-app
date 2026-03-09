/**
 * Factories reutilizables para tests de todos los módulos.
 * Patrón: cada factory acepta overrides parciales.
 */

export function createMockEmailInbox(overrides?: Record<string, unknown>) {
  return {
    id: "inbox-test-1",
    externalId: "msg-001",
    from: "cliente@example.com",
    fromName: "Cliente Test",
    to: "contacto@restaurante.com",
    subject: "Reserva para sábado",
    snippet: "Quería reservar mesa para 4...",
    body: "Quería reservar mesa para 4 personas el sábado.",
    date: new Date("2026-03-01T10:00:00Z"),
    threadId: "thread-001",
    labelIds: ["INBOX"],
    isRead: false,
    isStarred: false,
    hasAttachments: false,
    hasDraft: false,
    priority: "NORMAL",
    actionRequired: true,
    categoryId: "cat-reservas",
    category: { id: "cat-reservas", name: "Reservas", color: "#3B82F6" },
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    ...overrides,
  }
}

export function createMockEmailReply(overrides?: Record<string, unknown>) {
  return {
    id: "reply-test-1",
    emailInboxId: "inbox-test-1",
    externalId: "msg-reply-001",
    body: "Gracias por contactar. Su reserva está confirmada.",
    htmlBody: "<p>Gracias por contactar. Su reserva está confirmada.</p>",
    sentAt: new Date("2026-03-01T11:00:00Z"),
    sentBy: "user-test-1",
    type: "SENT",
    isDraft: false,
    draftSource: null,
    draftScore: null,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    ...overrides,
  }
}

export function createMockEmailTemplate(overrides?: Record<string, unknown>) {
  return {
    id: "tpl-test-1",
    name: "Confirmación de reserva",
    subject: "Confirmación: {asunto}",
    body: "Estimado/a {nombre}, su reserva para {fecha} está confirmada.",
    categoryId: "cat-reservas",
    isActive: true,
    createdBy: "user-test-1",
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
    ...overrides,
  }
}

export function createMockTag(overrides?: Record<string, unknown>) {
  return {
    id: "tag-test-1",
    name: "Urgente",
    color: "#EF4444",
    projectId: "project-test-1",
    createdAt: new Date("2026-01-15"),
    ...overrides,
  }
}

export function createMockTaskComment(overrides?: Record<string, unknown>) {
  return {
    id: "comment-test-1",
    content: "Esto hay que revisarlo antes del viernes.",
    taskId: "task-test-1",
    authorId: "user-test-1",
    author: { id: "user-test-1", name: "Test User", image: null },
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    ...overrides,
  }
}

export function createMockTaskAttachment(overrides?: Record<string, unknown>) {
  return {
    id: "attach-test-1",
    fileName: "documento.pdf",
    fileSize: 1024000,
    mimeType: "application/pdf",
    url: "/attachments/task-test-1/documento.pdf",
    taskId: "task-test-1",
    uploadedBy: "user-test-1",
    createdAt: new Date("2026-03-01"),
    ...overrides,
  }
}

export function createMockNotification(overrides?: Record<string, unknown>) {
  return {
    id: "notif-test-1",
    title: "Nueva tarea asignada",
    message: "Se te ha asignado la tarea 'Revisar menú'.",
    type: "TASK_ASSIGNED",
    isRead: false,
    userId: "user-test-1",
    link: "/projects/project-test-1/tasks/task-test-1",
    createdAt: new Date("2026-03-01"),
    ...overrides,
  }
}

export function createMockProjectMember(overrides?: Record<string, unknown>) {
  return {
    id: "member-test-1",
    userId: "user-test-1",
    projectId: "project-test-1",
    role: "EDITOR",
    user: { id: "user-test-1", name: "Test User", email: "test@dreamland.com", image: null },
    createdAt: new Date("2026-01-15"),
    ...overrides,
  }
}

export function createMockRecipe(overrides?: Record<string, unknown>) {
  return {
    id: "recipe-test-1",
    name: "Paella Valenciana",
    description: "Receta tradicional de paella",
    categoryId: "cat-arroces",
    familyId: "fam-arroces",
    status: "ACTIVE",
    prepTime: 30,
    cookTime: 45,
    servings: 4,
    theoreticalCost: 12.50,
    allergens: [],
    steps: ["Sofreír verduras", "Añadir arroz", "Cocer 18 min"],
    photos: [],
    protocoloDeSala: null,
    externalId: null,
    externalSource: null,
    yurestId: null,
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
    ...overrides,
  }
}

export function createMockProcessRun(overrides?: Record<string, unknown>) {
  return {
    id: "run-test-1",
    processSlug: "gstock-sync",
    status: "COMPLETED",
    triggeredBy: "user-test-1",
    startedAt: new Date("2026-03-01T08:00:00Z"),
    completedAt: new Date("2026-03-01T08:05:00Z"),
    durationMs: 300000,
    result: null,
    error: null,
    createdAt: new Date("2026-03-01"),
    ...overrides,
  }
}
