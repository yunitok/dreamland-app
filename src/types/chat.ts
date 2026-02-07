export interface ToolInvocation {
    toolCallId: string;
    toolName: string;
    args: any;
    state: 'call' | 'result';
    result?: any;
}

export interface UIMessage {
    id: string;
    role: string;
    content: string;
    toolInvocations?: ToolInvocation[];
    // Basic fields that might come from SDK
    createdAt?: Date;
}
