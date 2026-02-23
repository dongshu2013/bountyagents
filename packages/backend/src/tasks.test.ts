import request from "supertest";
import app from "../src/app";
import { closeDb, getDb } from "../src/db";
import { generateToken } from "../src/middleware/auth";

// Use a temp in-memory DB path for tests
process.env.DB_DIR = "/tmp/bountyagents-test-" + Date.now();

const POSTER_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const WORKER_ADDR = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

const posterToken = generateToken(POSTER_ADDR, POSTER_ADDR);
const workerToken = generateToken(WORKER_ADDR, WORKER_ADDR);

afterAll(() => {
  closeDb();
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
  });
});

describe("Tasks API", () => {
  let taskId: string;

  it("POST /tasks - creates a new task", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${posterToken}`)
      .send({
        title: "Write a blog post",
        description: "Write a 500-word blog post about DeFi",
        bountyAmount: "0.1",
        bountyToken: "ETH",
        posterAddress: POSTER_ADDR,
        tags: ["writing", "defi"],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Write a blog post");
    expect(res.body.data.status).toBe("open");
    expect(res.body.data.bountyAmount).toBe("0.1");
    taskId = res.body.data.id;
  });

  it("POST /tasks - rejects missing required fields", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${posterToken}`)
      .send({ title: "Incomplete task" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /tasks - requires authentication", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ title: "No auth task", description: "desc", bountyAmount: "0.1", posterAddress: POSTER_ADDR });

    expect(res.status).toBe(401);
  });

  it("GET /tasks - returns task list", async () => {
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET /tasks?status=open - filters by status", async () => {
    const res = await request(app).get("/tasks?status=open");
    expect(res.status).toBe(200);
    res.body.data.forEach((t: { status: string }) => expect(t.status).toBe("open"));
  });

  it("GET /tasks/:id - returns task by id", async () => {
    const res = await request(app).get(`/tasks/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(taskId);
  });

  it("GET /tasks/:id - returns 404 for unknown id", async () => {
    const res = await request(app).get("/tasks/nonexistent-id");
    expect(res.status).toBe(404);
  });

  it("POST /tasks/:id/accept - cannot accept own task", async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/accept`)
      .set("Authorization", `Bearer ${posterToken}`)
      .send({ workerAddress: POSTER_ADDR });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("POST /tasks/:id/accept - worker accepts task", async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/accept`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ workerAddress: WORKER_ADDR });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("accepted");
    expect(res.body.data.workerAddress).toBe(WORKER_ADDR.toLowerCase());
  });

  it("POST /tasks/:id/accept - cannot accept already accepted task", async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/accept`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ workerAddress: WORKER_ADDR });

    expect(res.status).toBe(409);
  });

  it("POST /tasks/:id/complete - only worker can complete", async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${posterToken}`)
      .send({ completionProof: "https://example.com/proof" });

    expect(res.status).toBe(403);
  });

  it("POST /tasks/:id/complete - worker completes task", async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ completionProof: "https://example.com/proof" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("completed");
    expect(res.body.data.completionProof).toBe("https://example.com/proof");
  });

  it("POST /tasks/:id/verify - only poster can verify", async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/verify`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ approved: true, txHash: "0xabc123" });

    expect(res.status).toBe(403);
  });

  it("POST /tasks/:id/verify - poster approves and records payment tx", async () => {
    const res = await request(app)
      .post(`/tasks/${taskId}/verify`)
      .set("Authorization", `Bearer ${posterToken}`)
      .send({ approved: true, txHash: "0xabc123" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("verified");
    expect(res.body.data.txHash).toBe("0xabc123");
  });

  it("DELETE /tasks/:id - cannot cancel verified task", async () => {
    const res = await request(app)
      .delete(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${posterToken}`);

    expect(res.status).toBe(409);
  });
});

describe("Cancel task flow", () => {
  let cancelTaskId: string;

  it("creates a task to cancel", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${posterToken}`)
      .send({
        title: "Task to cancel",
        description: "Will be cancelled",
        bountyAmount: "0.05",
        posterAddress: POSTER_ADDR,
      });
    expect(res.status).toBe(201);
    cancelTaskId = res.body.data.id;
  });

  it("DELETE /tasks/:id - poster cancels open task", async () => {
    const res = await request(app)
      .delete(`/tasks/${cancelTaskId}`)
      .set("Authorization", `Bearer ${posterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /tasks/:id - cancelled task shows cancelled status", async () => {
    const res = await request(app).get(`/tasks/${cancelTaskId}`);
    expect(res.body.data.status).toBe("cancelled");
  });
});

describe("Reject completion flow", () => {
  let rejTaskId: string;

  it("creates, accepts, completes, then rejects a task", async () => {
    // Create
    let res = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${posterToken}`)
      .send({
        title: "Rejected task",
        description: "Work will be rejected",
        bountyAmount: "0.2",
        posterAddress: POSTER_ADDR,
      });
    expect(res.status).toBe(201);
    rejTaskId = res.body.data.id;

    // Accept
    res = await request(app)
      .post(`/tasks/${rejTaskId}/accept`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ workerAddress: WORKER_ADDR });
    expect(res.body.data.status).toBe("accepted");

    // Complete
    res = await request(app)
      .post(`/tasks/${rejTaskId}/complete`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ completionProof: "https://bad-proof.com" });
    expect(res.body.data.status).toBe("completed");

    // Reject (poster disapproves)
    res = await request(app)
      .post(`/tasks/${rejTaskId}/verify`)
      .set("Authorization", `Bearer ${posterToken}`)
      .send({ approved: false });
    expect(res.status).toBe(200);
    // Task should be reopened
    expect(res.body.data.status).toBe("open");
    expect(res.body.data.workerAddress).toBeUndefined();
  });
});
