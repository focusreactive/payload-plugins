import type { PayloadRequest } from "payload";

export interface BaseDocument {
  id: string | number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (
    args: Record<string, unknown>,
    req: PayloadRequest
  ) => Promise<{
    content: {
      type: "text";
      text: string;
    }[];
  }>;
}

export interface ContentBlock {
  type: "text";
  text: string;
}
