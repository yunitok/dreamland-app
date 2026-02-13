# Groq Integration - Dreamland Manager

## Overview

**Groq** is the **recommended AI provider** for the Dreamland Manager Voice Assistant. It offers ultra-fast inference speeds using the `llama-3.3-70b-versatile` model with generous free tier quotas.

---

## Why Groq?

### Advantages

| Feature | Groq | Others |
|---------|------|--------|
| **Speed** | ⚡ ~1-2 seconds | 🐌 ~3-5 seconds |
| **Free Tier** | 💰 14,400 req/day | 💰 Limited |
| **Rate Limit Transparency** | ✅ Real-time headers | ❌EstimatedOnly |
| **Model Quality** | 🎯 70B params (SOTA) | 🎯 Varies |
| **Cost** | 🆓 Free tier generous | 💵 Pay-as-you-go |

### Ideal Use Cases
- ✅ Production deployments with moderate usage (<14K requests/day)
- ✅ Real-time voice commands requiring instant feedback
- ✅ Cost-sensitive projects (free tier sufficient for most teams)
- ✅ Projects needing transparent rate limit monitoring

---

## Getting Started

### 1. Get API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `gsk_...`)

### 2. Configure Environment

Add to your `.env` file:

```bash
# AI Provider Selection
AI_PROVIDER="groq"

# Groq API Key
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. Restart Server

```bash
npm run dev
```

The application will automatically use Groq for all voice commands.

---

## API Specifications

### Endpoint

```
POST https://api.groq.com/openai/v1/chat/completions
```

### Model

```
llama-3.3-70b-versatile
```

**Model Details**:
- **Parameters**: 70 billion
- **Context window**: 32,768 tokens (can process very long prompts)
- **Training data**: Up to Sept 2023
- **Capabilities**: Function calling, JSON mode, multi-turn conversations

### Request Format

```typescript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a voice assistant for a project management system...'
      },
      {
        role: 'user',
        content: 'Create task: Fix login bug'
      }
    ],
    temperature: 0.2,  // Low temperature for consistent commands
    max_tokens: 500    // Sufficient for command parsing
  })
});
```

### Response Format

```json
{
  "id": "chatcmpl-xyz",
  "object": "chat.completion",
  "created": 1706123456,
  "model": "llama-3.3-70b-versatile",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\"action\":\"createTask\",\"data\":{\"title\":\"Fix login bug\"}}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 245,
    "completion_tokens": 18,
    "total_tokens": 263
  }
}
```

---

## Rate Limits

### Free Tier Quotas

| Limit Type | Quota |
|------------|-------|
| **Requests per day** | 14,400 |
| **Requests per minute** | 30 |
| **Tokens per minute** | 20,000 |

### Response Headers

Groq provides **real-time rate limit information** in response headers:

```http
HTTP/1.1 200 OK
x-ratelimit-limit-requests: 30
x-ratelimit-limit-tokens: 20000
x-ratelimit-remaining-requests: 13847
x-ratelimit-remaining-tokens: 19245
x-ratelimit-reset-requests: 2s
x-ratelimit-reset-tokens: 3s
```

### Tracking in Application

The Groq provider captures these headers:

```typescript
export class GroqProvider implements AIProvider {
  async processVoiceCommand(transcript: string, locale: string) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/comp letions', {
      // ...config
    });
    
    // Extract rate limit info
    const remainingRequests = parseInt(
      response.headers.get('x-ratelimit-remaining-requests') || '0'
    );
    const remainingTokens = parseInt(
      response.headers.get('x-ratelimit-remaining-tokens') || '0'
    );
    
    // Log to database
    await prisma.aiUsageLog.create({
      data: {
        modelName: 'llama-3.3-70b-versatile',
        actionType: 'VoiceCommand',
        remainingRequests,
        remainingTokens,
        // ...other fields
      }
    });
    
    return { remainingRequests, remainingTokens };
  }
}
```

### UI Display

The project header shows live quota:

```tsx
import { useGroqUsage } from '@/lib/hooks/use-groq-usage';

export function UsageIndicator() {
  const { remaining, limit } = useGroqUsage();
  
  return (
    <div>
      🟢 Groq: {remaining.toLocaleString()} / {limit.toLocaleString()} requests remaining
    </div>
  );
}
```

---

## Implementation Details

### Provider Class

**File**: `src/lib/ai/groq-provider.ts`

```typescript
import Groq from 'groq-sdk';
import type { AIProvider, CommandResponse } from './provider.interface';

export class GroqProvider implements AIProvider {
  private client: Groq;
  
  constructor() {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  
  async processVoiceCommand(transcript: string, locale: string): Promise<CommandResponse> {
    try {
      // 1. Call Groq API
      const completion = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: this.getSystemPrompt(locale) },
          { role: 'user', content: transcript }
        ],
        temperature: 0.2,
        max_tokens: 500
      });
      
      // 2. Parse JSON response
      const command = JSON.parse(completion.choices[0].message.content);
      
      // 3. Log usage
      await this.logUsage(completion);
      
      // 4. Execute command
      return await this.executeCommand(command, locale);
      
    } catch (error) {
      console.error('Groq error:', error);
      return {
        success: false,
        message: locale === 'es' 
          ? 'Error al procesar el comando' 
          : 'Error processing command'
      };
    }
  }
  
  private getSystemPrompt(locale: string): string {
    const language = locale === 'es' ? 'Spanish' : 'English';
    
    return `You are a voice assistant for a project management system.
Parse the user's command and return a JSON object with:
{
  "action": "createTask" | "createList" | "deleteTask" | "updateTask",
  "data": { ... }
}

Respond in ${language}.`;
  }
  
  private async logUsage(completion: any) {
    await prisma.aiUsageLog.create({
      data: {
        modelName: 'llama-3.3-70b-versatile',
        actionType: 'VoiceCommand',
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      }
    });
  }
  
  private async executeCommand(command: any, locale: string): Promise<CommandResponse> {
    // Implementation in base class or shared module
    // ...
  }
}
```

---

## Error Handling

### Rate Limit Exceeded (429)

```typescript
if (error.status === 429) {
  return {
    success: false,
    message: locale === 'es'
      ? 'Límite de solicitudes alcanzado. Por favor, espera un momento.'
      : 'Rate limit exceeded. Please wait a moment.'
  };
}
```

### Invalid API Key (401)

```typescript
if (error.status === 401) {
  console.error('Invalid Groq API key');
  return {
    success: false,
    message: 'Authentication error. Please check API key configuration.'
  };
}
```

### Network Errors

```typescript
catch (error) {
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return {
      success: false,
      message: locale === 'es'
        ? 'Error de conexión. Verifica tu conexión a internet.'
        : 'Connection error. Please check your internet connection.'
    };
  }
}
```

---

## Performance Optimization

### 1. Reduce Prompt Size

Keep system prompts concise to save tokens:

```typescript
// ❌ Too verbose (wastes tokens)
const systemPrompt = `
You are an advanced AI assistant designed specifically for managing complex
project management workflows within the Dreamland Manager platform...
`;

// ✅ Concise (efficient)
const systemPrompt = `
Voice assistant for project management.
Return JSON: {action, data}.
Actions: createTask, createList, deleteTask, updateTask.
`;
```

### 2. Use Low Temperature

For command parsing, use low temperature (0.2) for consistency:

```typescript
{
  temperature: 0.2  // More deterministic
}
```

### 3. Stream Responses (Future)

Groq supports streaming for real-time feedback:

```typescript
const stream = await this.client.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [...],
  stream: true
});

for await (const chunk of stream) {
  // Process chunk in real-time
}
```

---

## Cost Analysis

### Free Tier Breakdown

With 14,400 requests/day:
- **Small team (5 users)**: ~2,880 commands per user per day
- **Medium team (20 users)**: ~720 commands per user per day
- **Large team (50 users)**: ~288 commands per user per day

**Realistic usage**: Most users issue 10-50 commands/day → Free tier sufficient for teams up to **150-300 users**.

### Paid Tier (if needed)

If you exceed free tier, Groq offers pay-as-you-go:
- **Pricing**: Check [console.groq.com/settings/billing](https://console.groq.com/settings/billing)
- **Cost example**: ~$0.001 per request (approx)

---

## Comparison: Groq vs OpenAI GPT-4

| Feature | Groq (Llama 3.3 70B) | OpenAI GPT-4 |
|---------|----------------------|--------------|
| Speed | ⚡ 1-2s | 🐌 3-5s |
| Cost (free tier) | 💰 14,400/day | 💰 None (pay only) |
| Cost (paid) | 💰 Very low | 💰 High ($0.01-0.03/req) |
| Accuracy | 🎯 Excellent | 🎯 Best-in-class |
| Rate limits | 📊 30/min | 📊 Varies by tier |

**Recommendation**: Use Groq for production unless you need GPT-4's advanced reasoning.

---

## Troubleshooting

### "Rate limit exceeded" despite showing quota remaining

**Cause**: Groq has both requests/min (30) and tokens/min (20,000) limits.

**Solution**: Space out requests or reduce prompt size.

### "Model not found" error

**Cause**: Incorrect model name in code.

**Solution**: Verify model is exactly `llama-3.3-70b-versatile` (not `llama-3.3-70b` or similar).

### Slow responses (>5 seconds)

**Possible causes**:
1. Network latency → Try different network
2. Groq API issues → Check [status.groq.com](https://status.groq.com)
3. Large prompts → Reduce system prompt size

---

## Further Reading

- [Voice Assistant Architecture](./architecture.md)
- [Usage Tracking](./usage-tracking.md)
- [Gemini Integration](./gemini-integration.md)
- [Groq Official Docs](https://console.groq.com/docs)
