---
title: Gemini Integration
description: Google Gemini AI provider implementation
---

# Google Gemini Integration - Dreamland Manager

## Overview

**Google Gemini** serves as a reliable **fallback AI provider** for the Dreamland Manager Voice Assistant. It uses the `gemini-1.5-flash` model, offering a good balance of speed and accuracy.

---

## When to Use Gemini

### Use Cases

✅ **Fallback provider** when Groq is unavailable or rate-limited  
✅ **Multi-modal future features** (Gemini supports image/video inputs)  
✅ **Google Cloud integrations** (if already using GCP)  
✅ **Preference for Google ecosystem**

### Comparison with Groq

| Feature | Gemini | Groq |
|---------|--------|------|
| **Speed** | 🐌 ~2-4 seconds | ⚡ ~1-2 seconds |
| **Free Tier** | 💰 1,500 req/day | 💰 14,400 req/day |
| **Rate Limit Visibility** | ❌ Estimated locally | ✅ Real-time headers |
| **Model** | gemini-1.5-flash | llama-3.3-70b-versatile |
| **Multi-modal** | ✅ Images/Video | ❌ Text only |

**Recommendation**: Use Groq as primary, Gemini as fallback.

---

## Getting Started

### 1. Get API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Get API Key**
4. Create a new project (if needed)
5. Copy the API key (starts with `AIza...`)

### 2. Configure Environment

Add to your `.env` file:

```bash
# AI Provider Selection
AI_PROVIDER="gemini"

# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY="AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. Restart Server

```bash
npm run dev
```

The application will now use Gemini for all voice commands.

---

## API Specifications

### SDK

Dreamland Manager uses the official Google Generative AI SDK:

```bash
npm install @google/generative-ai
```

### Model

```
gemini-1.5-flash
```

**Model Details**:
- **Speed**: Optimized for fast responses (~2-4 seconds)
- **Context window**: 1 million tokens (extremely large)
- **Training data**: Up to Nov 2023
- **Capabilities**: Text, images, video, code generation, JSON mode

### Request Format

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const result = await model.generateContent({
  contents: [
    {
      role: 'user',
      parts: [{ text: 'You are a voice assistant...' }]  // System prompt
    },
    {
      role: 'user',
      parts: [{ text: 'Create task: Fix login bug' }]   // User command
    }
  ],
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 500
  }
});

const text = result.response.text();
const command = JSON.parse(text);
```

### Response Format

```json
{
  "action": "createTask",
  "data": {
    "title": "Fix login bug"
  }
}
```

---

## Rate Limits

### Free Tier Quotas

| Limit Type | Quota |
|------------|-------|
| **Requests per day** | 1,500 |
| **Requests per minute** | 15 |
| **Tokens per minute** | 32,000 |

> [!WARNING]
> Gemini's free tier is significantly lower than Groq's. For production with high usage, consider Groq or paid plans.

### Rate Limit Estimation

Unlike Groq, Gemini **does NOT provide rate limit headers**. The application estimates usage based on local database logs:

```typescript
async getUsageInfo(): Promise<UsageInfo> {
  const now = Date.now();
  
  // Count requests in last 60 seconds (RPM)
  const logsLastMinute = await prisma.aiUsageLog.count({
    where: {
      modelName: 'gemini-1.5-flash',
      createdAt: { gte: new Date(now - 60000) }
    }
  });
  
  // Count requests in last 24 hours (RPD)
  const logsLastDay = await prisma.aiUsageLog.count({
    where: {
      modelName: 'gemini-1.5-flash',
      createdAt: { gte: new Date(now - 86400000) }
    }
  });
  
  return {
    estimatedRPM: logsLastMinute,
    estimatedRPD: logsLastDay
  };
}
```

### UI Display

The project header shows estimated usage:

```tsx
🔵 Gemini: 12 RPM / 450 RPD
```

**Limitations**:
- ❌ Not real-time (based on local logs)
- ❌ Doesn't account for requests from other apps/users
- ❌ Resets when database is cleared

---

## Implementation Details

### Provider Class

**File**: `src/lib/ai/gemini-provider.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, CommandResponse, UsageInfo } from './provider.interface';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY!
    );
  }
  
  async processVoiceCommand(transcript: string, locale: string): Promise<CommandResponse> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // 1. Call Gemini API
      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: this.getSystemPrompt(locale) }] },
          { role: 'user', parts: [{ text: transcript }] }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500
        }
      });
      
      // 2. Parse JSON response
      const text = result.response.text();
      const command = JSON.parse(text);
      
      // 3. Log usage
      await this.logUsage(result);
      
      // 4. Execute command
      return await this.executeCommand(command, locale);
      
    } catch (error) {
      console.error('Gemini error:', error);
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
Parse the user's command and return ONLY a JSON object with:
{
  "action": "createTask" | "createList" | "deleteTask" | "updateTask",
  "data": { ... }
}

Respond in ${language}.`;
  }
  
  private async logUsage(result: any) {
    const usage = result.response.usageMetadata;
    
    await prisma.aiUsageLog.create({
      data: {
        modelName: 'gemini-1.5-flash',
        actionType: 'VoiceCommand',
        promptTokens: usage?.promptTokenCount || 0,
        completionTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0
      }
    });
  }
  
  async getUsageInfo(): Promise<UsageInfo> {
    // Implementation shown in "Rate Limit Estimation" section above
    // ...
  }
}
```

---

## Error Handling

### Rate Limit Exceeded (429)

```typescript
if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
  return {
    success: false,
    message: locale === 'es'
      ? 'Límite de solicitudes alcanzado. Intenta de nuevo más tarde.'
      : 'Rate limit exceeded. Please try again later.'
  };
}
```

### Invalid API Key (401)

```typescript
if (error.message.includes('API key not valid')) {
  console.error('Invalid Gemini API key');
  return {
    success: false,
    message: 'Authentication error. Please check API key configuration.'
  };
}
```

### Model Not Available

```typescript
if (error.message.includes('models/gemini')) {
  return {
    success: false,
    message: 'Model unavailable. Please try again later.'
  };
}
```

---

## Performance Optimization

### 1. Use JSON Mode

Force Gemini to return only JSON (no extra text):

```typescript
const result = await model.generateContent({
  contents: [...],
  generationConfig: {
    responseMimeType: 'application/json',  // Ensure JSON output
    temperature: 0.2
  }
});
```

### 2. Reduce Token Usage

Use concise system prompts:

```typescript
// ❌ Wasteful
const prompt = `
You are an advanced AI assistant specialized in project management.
You have access to the following commands: createTask, createList, ...
Please analyze the user's input and determine the appropriate action...
`;

// ✅ Efficient
const prompt = `Voice assistant. Return JSON: {action, data}. Actions: createTask, createList, deleteTask, updateTask.`;
```

### 3. Cache System Prompts (Future)

Gemini supports prompt caching to reduce costs:

```typescript
const cachedModel = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  cachedContent: systemPromptCached  // Reuse across requests
});
```

---

## Cost Analysis

### Free Tier Breakdown

With 1,500 requests/day:
- **Small team (5 users)**: ~300 commands per user per day
- **Medium team (15 users)**: ~100 commands per user per day
- **Large team (50 users)**: ~30 commands per user per day

**Realistic usage**: Free tier suitable for teams up to **30-50 users** (assuming 20-30 commands/day per user).

### Paid Tier

If you exceed free tier:
- **Pricing**: Check [ai.google.dev/pricing](https://ai.google.dev/pricing)
- **gemini-1.5-flash**: ~$0.000075 per 1K tokens (very affordable)
- **Example**: 10,000 requests/month ≈ $1-2 USD

---

## Multi-Modal Capabilities (Future)

Gemini supports images and video, enabling future features:

### Image Input Example

```typescript
const imageResult = await model.generateContent({
  contents: [
    {
      role: 'user',
      parts: [
        { text: 'Analyze this project diagram and create tasks' },
        { inlineData: { mimeType: 'image/png', data: base64Image } }
      ]
    }
  ]
});
```

**Potential Use Cases**:
- Upload whiteboard photos → Auto-generate tasks
- Scan handwritten notes → Create project items
- Analyze charts → Extract metrics

---

## Switching from Groq to Gemini

### Scenario: Groq Quota Exhausted

If Groq hits rate limits, automatically fall back to Gemini:

```typescript
// src/lib/ai/factory.ts
export function getAIProvider(): AIProvider {
  const primaryProvider = process.env.AI_PROVIDER || 'groq';
  
  // Check if Groq quota exhausted
  if (primaryProvider === 'groq') {
    const groqQuota = await checkGroqQuota();
    if (groqQuota.remaining < 10) {
      console.warn('Groq quota low, switching to Gemini');
      return new GeminiProvider();
    }
  }
  
  return primaryProvider === 'groq' ? new GroqProvider() : new GeminiProvider();
}
```

---

## Troubleshooting

### "API key not valid" error

**Cause**: Incorrect API key or key not enabled.

**Solution**:
1. Verify key in [AI Studio](https://aistudio.google.com/app/apikey)
2. Ensure Gemini API is enabled in your project
3. Check for extra spaces in `.env` file

### Slow responses (>10 seconds)

**Possible causes**:
1. Large prompts → Reduce system prompt
2. Network issues → Check internet connection
3. Google API issues → Check [status.cloud.google.com](https://status.cloud.google.com)

### "RESOURCE_EXHAUSTED" error

**Cause**: Rate limit exceeded.

**Solution**: Wait for quota reset (1 minute or 24 hours depending on limit type).

---

## Migration to Gemini 2.0 (Future)

Google is releasing Gemini 2.0 with improved speed and capabilities. To upgrade:

```typescript
// Change model name
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
```

No other code changes required (same API interface).

---

## Further Reading

- [Voice Assistant Architecture](./architecture.md)
- [Groq Integration](./groq-integration.md)
- [Usage Tracking](./usage-tracking.md)
- [Google Gemini Official Docs](https://ai.google.dev/docs)
