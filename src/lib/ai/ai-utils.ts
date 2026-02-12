/**
 * Utility to detect if an AI message contains a completed tool call.
 * This function is designed to be resilient to different AI providers and 
 * experimental model formats (like Gemini 3).
 * 
 * @param message The assistant message object from useChat
 * @returns Set of toolCallIds that have successfully finished
 */
type AiMessageLike = {
    role?: string
    toolInvocations?: unknown[]
    parts?: Array<{ type?: string; toolInvocation?: unknown; toolCall?: unknown; [key: string]: unknown }>
}

export function detectFinishedToolCalls(message: AiMessageLike): Set<string> {
    const finishedIds = new Set<string>();
    if (!message || message.role !== 'assistant') return finishedIds;

    // 1. Standard Vercel AI SDK toolInvocations
    const topLevelInvocations = message.toolInvocations || [];

    // 2. Scan parts for hidden or experimental tool structures
    const partInvocations = (message.parts || []).map((p) => {
        // Standard formats
        if (p.type === 'tool-invocation') return p.toolInvocation;
        if (p.type === 'tool-call') return p;
        if (p.type === 'tool-result') return { ...p, state: 'result' };
        
        // Dynamic prefix matching (e.g., 'tool-createlist' in Gemini 3)
        // We look for any part starting with 'tool-' that might be an invocation
        if (p.type?.startsWith('tool-')) {
            return p.toolInvocation || p.toolCall || p;
        }
        
        return null;
    }).filter(Boolean);

    const allInvocations = [...topLevelInvocations, ...partInvocations];

    allInvocations.forEach((ti) => {
        const inv = ti as Record<string, unknown>
        const id = inv.toolCallId || inv.id;
        const state = inv.state;
        const hasResult = !!(inv.result || inv.output);

        /**
         * SCALABILITY RULES:
         * - 'result': Standard AI SDK finish state
         * - 'output-available': Gemini 3 experimental finish state
         * - hasResult: Fallback if state is missing but data is present
         */
        const isFinished = 
            state === 'result' || 
            state === 'output-available' || 
            (state !== 'call' && hasResult);

        if (id && isFinished) {
            finishedIds.add(String(id));
        }
    });

    return finishedIds;
}
