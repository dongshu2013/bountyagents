import { BountyAgentsConfig, Task } from "./types";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class BountyAgentsClient {
  private baseUrl: string;
  private authToken: string;
  private fetch: FetchFn;

  constructor(config: BountyAgentsConfig, fetchFn?: FetchFn) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.authToken = config.authToken;
    // Allow injecting a fetch implementation (useful for testing / environments
    // that don't have the global fetch, e.g. older Node versions).
    this.fetch = fetchFn ?? (globalThis.fetch as FetchFn);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.authToken}`,
    };

    const res = await this.fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = (await res.json()) as ApiResponse<T>;
    if (!json.success) {
      throw new Error(json.error ?? `Request failed with status ${res.status}`);
    }
    return json.data as T;
  }

  listTasks(status?: string, tag?: string): Promise<Task[]> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return this.request<Task[]>("GET", `/tasks${qs ? `?${qs}` : ""}`);
  }

  getTask(id: string): Promise<Task> {
    return this.request<Task>("GET", `/tasks/${id}`);
  }

  postTask(task: {
    title: string;
    description: string;
    bountyAmount: string;
    bountyToken?: string;
    posterAddress: string;
    tags?: string[];
  }): Promise<Task> {
    return this.request<Task>("POST", "/tasks", task);
  }

  acceptTask(id: string, workerAddress: string): Promise<Task> {
    return this.request<Task>("POST", `/tasks/${id}/accept`, { workerAddress });
  }

  completeTask(id: string, completionProof: string): Promise<Task> {
    return this.request<Task>("POST", `/tasks/${id}/complete`, { completionProof });
  }

  verifyTask(id: string, approved: boolean, txHash?: string): Promise<Task> {
    return this.request<Task>("POST", `/tasks/${id}/verify`, { approved, txHash });
  }

  cancelTask(id: string): Promise<void> {
    return this.request<void>("DELETE", `/tasks/${id}`);
  }
}
