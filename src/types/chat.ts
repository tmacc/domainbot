export interface DomainResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: number;
  errorMessage?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
  streaming?: boolean;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  domainResults?: DomainResult[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preview?: string;
}
