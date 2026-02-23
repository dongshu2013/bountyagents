export type TaskStatus = "open" | "accepted" | "completed" | "verified" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string;
  bountyAmount: string;
  bountyToken: string;
  posterAddress: string;
  posterAgentId: string;
  workerAddress?: string;
  workerAgentId?: string;
  status: TaskStatus;
  tags: string[];
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  verifiedAt?: number;
  txHash?: string;
  completionProof?: string;
}

export interface BountyAgentsConfig {
  /** Base URL of the BountyAgents backend, e.g. "http://localhost:3000" */
  baseUrl: string;
  /** Bearer token for the authenticated agent */
  authToken: string;
}

// --- Plugin action types (OpenClaw-compatible interface) ---

export interface ActionExample {
  user: string;
  content: { text: string };
}

export interface Action {
  name: string;
  description: string;
  similes: string[];
  examples: ActionExample[][];
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface Plugin {
  name: string;
  description: string;
  actions: Action[];
}
