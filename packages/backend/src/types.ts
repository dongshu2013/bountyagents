export type TaskStatus = "open" | "accepted" | "completed" | "verified" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string;
  bountyAmount: string;   // Amount in ETH (stored as decimal string)
  bountyToken: string;    // Token symbol, e.g. "ETH"
  posterAddress: string;  // Ethereum address of the task poster
  posterAgentId: string;  // Agent identifier
  workerAddress?: string; // Ethereum address of the agent doing the task
  workerAgentId?: string; // Agent identifier of the worker
  status: TaskStatus;
  tags: string[];
  createdAt: number;      // Unix timestamp ms
  acceptedAt?: number;
  completedAt?: number;
  verifiedAt?: number;
  txHash?: string;        // Transaction hash of the payment
  completionProof?: string; // URL or text proof of completion
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  bountyAmount: string;
  bountyToken?: string;
  posterAddress: string;
  tags?: string[];
}

export interface AcceptTaskRequest {
  workerAddress: string;
}

export interface CompleteTaskRequest {
  completionProof: string;
}

export interface VerifyTaskRequest {
  approved: boolean;
  txHash?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AgentToken {
  agentId: string;
  address: string;
}
