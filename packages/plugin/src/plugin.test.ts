import { BountyAgentsClient } from "../src/client";
import { createBountyAgentsPlugin } from "../src/index";

const MOCK_BASE_URL = "http://localhost:3000";
const MOCK_TOKEN = "test-token";

const mockTask = {
  id: "task-1",
  title: "Test task",
  description: "A test task",
  bountyAmount: "0.1",
  bountyToken: "ETH",
  posterAddress: "0xposter",
  posterAgentId: "0xposter",
  status: "open" as const,
  tags: [],
  createdAt: Date.now(),
};

// Build a mock fetch that returns a successful ApiResponse
function mockFetch(data: unknown) {
  return async (_url: string, _init?: RequestInit): Promise<Response> => {
    return {
      json: async () => ({ success: true, data }),
      status: 200,
      ok: true,
    } as unknown as Response;
  };
}

describe("BountyAgentsClient", () => {
  it("listTasks calls GET /tasks and returns task array", async () => {
    const client = new BountyAgentsClient(
      { baseUrl: MOCK_BASE_URL, authToken: MOCK_TOKEN },
      mockFetch([mockTask])
    );
    const tasks = await client.listTasks();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks[0].id).toBe("task-1");
  });

  it("listTasks passes status and tag query params", async () => {
    let capturedUrl = "";
    const fetchFn = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return { json: async () => ({ success: true, data: [] }) } as unknown as Response;
    };
    const client = new BountyAgentsClient(
      { baseUrl: MOCK_BASE_URL, authToken: MOCK_TOKEN },
      fetchFn
    );
    await client.listTasks("open", "defi");
    expect(capturedUrl).toContain("status=open");
    expect(capturedUrl).toContain("tag=defi");
  });

  it("postTask calls POST /tasks", async () => {
    let capturedMethod = "";
    let capturedBody: unknown;
    const fetchFn = async (_url: string, init?: RequestInit): Promise<Response> => {
      capturedMethod = init?.method ?? "";
      capturedBody = JSON.parse(init?.body as string);
      return { json: async () => ({ success: true, data: mockTask }) } as unknown as Response;
    };
    const client = new BountyAgentsClient(
      { baseUrl: MOCK_BASE_URL, authToken: MOCK_TOKEN },
      fetchFn
    );
    const task = await client.postTask({
      title: "Test task",
      description: "A test task",
      bountyAmount: "0.1",
      posterAddress: "0xposter",
    });
    expect(capturedMethod).toBe("POST");
    expect((capturedBody as { title: string }).title).toBe("Test task");
    expect(task.id).toBe("task-1");
  });

  it("throws on API error response", async () => {
    const fetchFn = async (): Promise<Response> => {
      return {
        json: async () => ({ success: false, error: "Task not found" }),
        status: 404,
      } as unknown as Response;
    };
    const client = new BountyAgentsClient(
      { baseUrl: MOCK_BASE_URL, authToken: MOCK_TOKEN },
      fetchFn
    );
    await expect(client.getTask("nonexistent")).rejects.toThrow("Task not found");
  });
});

describe("createBountyAgentsPlugin", () => {
  it("returns a plugin with the correct structure", () => {
    const plugin = createBountyAgentsPlugin({
      baseUrl: MOCK_BASE_URL,
      authToken: MOCK_TOKEN,
    });
    expect(plugin.name).toBe("bountyagents");
    expect(typeof plugin.description).toBe("string");
    expect(Array.isArray(plugin.actions)).toBe(true);

    const actionNames = plugin.actions.map((a) => a.name);
    expect(actionNames).toContain("POST_BOUNTY_TASK");
    expect(actionNames).toContain("LIST_BOUNTY_TASKS");
    expect(actionNames).toContain("ACCEPT_BOUNTY_TASK");
    expect(actionNames).toContain("COMPLETE_BOUNTY_TASK");
    expect(actionNames).toContain("VERIFY_BOUNTY_TASK");
  });

  it("each action has required fields", () => {
    const plugin = createBountyAgentsPlugin({
      baseUrl: MOCK_BASE_URL,
      authToken: MOCK_TOKEN,
    });
    for (const action of plugin.actions) {
      expect(typeof action.name).toBe("string");
      expect(typeof action.description).toBe("string");
      expect(Array.isArray(action.similes)).toBe(true);
      expect(Array.isArray(action.examples)).toBe(true);
      expect(typeof action.execute).toBe("function");
    }
  });
});
