# AI Chat Agent - Dreamland Manager

## Overview

The AI Chat Agent is a conversational interface that allows users to interact with the system using multi-turn natural language. Unlike the single-command Voice Assistant, the Chat Agent can handle complex reasoning, follow-up questions, and multi-step tool execution.

---

## 🏗️ Architecture (Vercel AI SDK v6)

The Chat Agent is built on the **Vercel AI SDK v6**, utilizing streaming responses and integrated tool calling.

### Multi-Step Execution
The agent is configured to handle complex workflows through multi-step processing:
- **`stopWhen: stepCountIs(5)`**: Allows the model up to 5 reasoning/execution cycles per user message. This ensures it can call a tool, analyze the result, and provide a final response without being cut off.

### Core Streaming Logic
**File**: `src/app/api/chat/route.ts`
- Uses `toUIMessageStreamResponse()` for seamless integration with the frontend.
- Captures `onStepFinish` and `onFinish` events for logging and database persistence.

---

## 🛠️ Integrated Tools

### `generateReport`
- **Description**: Generates a professional report for a project by name or ID.
- **Robustness Features**:
    - **Fuzzy Matching**: Matches project titles even with partial queries.
    - **Context Fallback**: Defaults to the active `projectId` if the query is ambiguous.
    - **Absolute Linking**: Combines `baseUrl` from headers with relative paths to ensure links work in any environment.

---

## 🛡️ Stability & Guardrails

To ensure a reliable user experience, we have implemented several strict guardrails:

### Anti-Hallucination Rules
The system prompt contains explicit "Truthfulness" constraints:
- **URL Verification**: The AI is strictly forbidden from "inventing" report URLs. It can only provide a link if the `generateReport` tool returns a valid ID.
- **Formatting**: Links are standardized to the format: **<u>[pulsa aquí]</u>**.

### Token Efficiency (429 Rate Limit Mitigation)
To stay within Groq's Tokens-Per-Minute (TPM) limits:
- **Context Compaction**: The global project list is passed as a compact pipe-separated string.
- **Provider Methods**: The `generateText` method is used for background tasks to avoid reloading the entire chat context history.

---

## 📊 Logging & Persistence

- **Partial Saving**: The system only saves messages once they are fully formed (avoiding "thought" or intermediate tool-call artifacts in the history).
- **Debug Logs**: All iterations are logged to `chat-debug.log` and `ai-debug.log` for troubleshooting multi-step failures.
