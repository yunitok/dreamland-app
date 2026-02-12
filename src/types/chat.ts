export interface ToolInvocation {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    state: 'call' | 'result';
    result?: unknown;
}

export interface UIMessage {
    id: string;
    role: string;
    content: string;
    toolInvocations?: ToolInvocation[];
    // Basic fields that might come from SDK
    createdAt?: Date;
}
