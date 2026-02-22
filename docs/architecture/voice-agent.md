---
title: Hybrid Voice/Chat Agent Architecture
description: Conversational interface for managing projects with text and voice input using Chain of Thought reasoning
---

# Hybrid Voice/Chat Agent Architecture

This document details the architecture of the **Hybrid Voice/Chat Agent** implemented in Dreamland. The system provides a conversational interface for managing projects, lists, and tasks, supporting both text and voice input with "Chain of Thought" reasoning.

## 1. System Overview

The agent is built using the **Vercel AI SDK** (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) to ensure standardized streaming, tool calling, and state management.

### Key Capabilities
- **Multimodal Input**: Accepts text or voice (transcribed via Web Speech API).
- **Context Awareness**: Dynamically loads project data (Lists, Tasks) into the System Prompt.
- **Persistence**: Saves entire conversation history to Postgres via Prisma.
- **Optimistic UI**: Immediate feedback for user messages and tool invocations.
- **Safety**: Requires user confirmation for destructive actions (e.g., deleting a list).

---

## 2. Technical Stack

| Component | Technology | Purpose |
|Bs|---|---|
| **LLM Provider** | Google Gemini 1.5 Flash | Fast, low-latency inference for chat and tool calling. |
| **SDK** | Vercel AI SDK (`streamText`) | Manages the LLM stream, tool roundtrips, and protocol. |
| **Frontend Hook** | `useChat` | Handles message state, loading, and optimistic updates. |
| **Database** | Prisma + Postgres | Stores `ChatSession` and `ChatMessage` history. |
| **Speech-to-Text** | Web Speech API | Browser-native speech recognition (no external API cost). |
| **Text-to-Speech** | `SpeechSynthesis` | Browser-native audio output for agent responses. |

---

## 3. Data Model

We introduced two new models to the Prisma Schema to support chat persistence.

### `ChatSession`
Represents a conversation thread associated with a specific Project and User.
```prisma
model ChatSession {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  messages  ChatMessage[]
  
  project   Project @relation(...)
  user      User    @relation(...)
}
```

### `ChatMessage`
Stores individual messages within a session.
```prisma
model ChatMessage {
  id              String   @id @default(cuid())
  sessionId       String
  role            String   // 'user' | 'assistant'
  content         String
  toolInvocations Json?    // Stores tool calls and results
  createdAt       DateTime @default(now())
}
```

---

## 4. Request Flow

1. **User Input**: User types or speaks a command (e.g., "Add a task to Sprint 1").
   - *Voice Input*: Transcribed client-side -> text inserted into input.
2. **API Request**: `POST /api/chat` sent with `messages` history and `projectId`.
3. **Server Action**:
   - Fetches Project Context (Lists, Tasks).
   - Generates System Prompt with context.
   - Saves User Message to DB (`saveMessage`).
4. **LLM Processing**:
   - `streamText` calls Gemini.
   - Tool calls (if any) are validated via Zod schemas.
   - Tools execute functions (e.g., `createTask`) on the server.
5. **Response**: 
   - Assistant text and/or Tool Results streamed back.
   - Full Assistant response saved to DB `onFinish`.
6. **Client Update**: UI displays the stream; `Text-to-Speech` reads the response.

---

## 5. Testing Strategy

El agente de voz está cubierto por tests unitarios y de componente.

### Tests Unitarios
- `src/__tests__/chat-service.test.ts` — 4 tests: creación de sesiones y guardado de mensajes
- `src/__tests__/task-lists.test.ts` — 5 tests: CRUD de task lists usadas por las tools del agente

### Tests de Componente
- `src/__tests__/chat-panel.test.tsx` — 4 tests: render del panel, apertura del sheet, historial, envío de mensajes
- `src/__tests__/login-form.test.tsx` — 3 tests: LoginForm con checkbox "Recuérdame"
- `src/__tests__/change-password-form.test.tsx` — 6 tests: validación y submit del formulario

### Ejecución

```bash
npm run test:run
```

Para el inventario completo de tests del proyecto, consulta la [Guía de Testing](/guides/testing).
