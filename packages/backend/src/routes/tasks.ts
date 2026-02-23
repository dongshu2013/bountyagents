import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { authenticate } from "../middleware/auth";
import {
  Task,
  TaskStatus,
  CreateTaskRequest,
  AcceptTaskRequest,
  CompleteTaskRequest,
  VerifyTaskRequest,
  ApiResponse,
  AgentToken,
} from "../types";

const router = Router();

type AuthedRequest = Request & { agent: AgentToken };

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    bountyAmount: row.bounty_amount as string,
    bountyToken: row.bounty_token as string,
    posterAddress: row.poster_address as string,
    posterAgentId: row.poster_agent_id as string,
    workerAddress: (row.worker_address as string | undefined) ?? undefined,
    workerAgentId: (row.worker_agent_id as string | undefined) ?? undefined,
    status: row.status as TaskStatus,
    tags: JSON.parse(row.tags as string) as string[],
    createdAt: row.created_at as number,
    acceptedAt: (row.accepted_at as number | undefined) ?? undefined,
    completedAt: (row.completed_at as number | undefined) ?? undefined,
    verifiedAt: (row.verified_at as number | undefined) ?? undefined,
    txHash: (row.tx_hash as string | undefined) ?? undefined,
    completionProof: (row.completion_proof as string | undefined) ?? undefined,
  };
}

/**
 * GET /tasks
 * List tasks, optionally filtered by status and/or tags.
 */
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const { status, tag } = req.query as { status?: string; tag?: string };

  let sql = "SELECT * FROM tasks";
  const params: string[] = [];

  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }

  sql += " ORDER BY created_at DESC";

  let rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  if (tag) {
    rows = rows.filter((r) => {
      const tags = JSON.parse(r.tags as string) as string[];
      return tags.includes(tag);
    });
  }

  const resp: ApiResponse<Task[]> = { success: true, data: rows.map(rowToTask) };
  res.json(resp);
});

/**
 * GET /tasks/:id
 * Get a single task by ID.
 */
router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    const resp: ApiResponse = { success: false, error: "Task not found" };
    res.status(404).json(resp);
    return;
  }

  const resp: ApiResponse<Task> = { success: true, data: rowToTask(row) };
  res.json(resp);
});

/**
 * POST /tasks
 * Create a new bounty task. Requires authentication.
 */
router.post("/", authenticate, (req: Request, res: Response) => {
  const agent = (req as AuthedRequest).agent;
  const body = req.body as Partial<CreateTaskRequest>;

  if (!body.title || !body.description || !body.bountyAmount || !body.posterAddress) {
    const resp: ApiResponse = {
      success: false,
      error: "title, description, bountyAmount, and posterAddress are required",
    };
    res.status(400).json(resp);
    return;
  }

  const id = uuidv4();
  const now = Date.now();
  const task: Task = {
    id,
    title: body.title,
    description: body.description,
    bountyAmount: body.bountyAmount,
    bountyToken: body.bountyToken ?? "ETH",
    posterAddress: body.posterAddress.toLowerCase(),
    posterAgentId: agent.agentId,
    status: "open",
    tags: body.tags ?? [],
    createdAt: now,
  };

  const db = getDb();
  db.prepare(`
    INSERT INTO tasks (
      id, title, description, bounty_amount, bounty_token,
      poster_address, poster_agent_id, status, tags, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id,
    task.title,
    task.description,
    task.bountyAmount,
    task.bountyToken,
    task.posterAddress,
    task.posterAgentId,
    task.status,
    JSON.stringify(task.tags),
    task.createdAt
  );

  const resp: ApiResponse<Task> = { success: true, data: task };
  res.status(201).json(resp);
});

/**
 * POST /tasks/:id/accept
 * Accept an open task. Requires authentication.
 */
router.post("/:id/accept", authenticate, (req: Request, res: Response) => {
  const agent = (req as AuthedRequest).agent;
  const db = getDb();
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    const resp: ApiResponse = { success: false, error: "Task not found" };
    res.status(404).json(resp);
    return;
  }

  if (row.status !== "open") {
    const resp: ApiResponse = { success: false, error: "Task is not open for acceptance" };
    res.status(409).json(resp);
    return;
  }

  if ((row.poster_agent_id as string) === agent.agentId) {
    const resp: ApiResponse = { success: false, error: "Cannot accept your own task" };
    res.status(409).json(resp);
    return;
  }

  const body = req.body as Partial<AcceptTaskRequest>;
  if (!body.workerAddress) {
    const resp: ApiResponse = { success: false, error: "workerAddress is required" };
    res.status(400).json(resp);
    return;
  }

  const now = Date.now();
  db.prepare(`
    UPDATE tasks
    SET status = 'accepted', worker_address = ?, worker_agent_id = ?, accepted_at = ?
    WHERE id = ?
  `).run(body.workerAddress.toLowerCase(), agent.agentId, now, req.params.id);

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as Record<
    string,
    unknown
  >;
  const resp: ApiResponse<Task> = { success: true, data: rowToTask(updated) };
  res.json(resp);
});

/**
 * POST /tasks/:id/complete
 * Mark a task as completed with proof. Requires authentication by the worker.
 */
router.post("/:id/complete", authenticate, (req: Request, res: Response) => {
  const agent = (req as AuthedRequest).agent;
  const db = getDb();
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    const resp: ApiResponse = { success: false, error: "Task not found" };
    res.status(404).json(resp);
    return;
  }

  if (row.status !== "accepted") {
    const resp: ApiResponse = { success: false, error: "Task must be in accepted state to complete" };
    res.status(409).json(resp);
    return;
  }

  if ((row.worker_agent_id as string) !== agent.agentId) {
    const resp: ApiResponse = { success: false, error: "Only the assigned worker can complete this task" };
    res.status(403).json(resp);
    return;
  }

  const body = req.body as Partial<CompleteTaskRequest>;
  if (!body.completionProof) {
    const resp: ApiResponse = { success: false, error: "completionProof is required" };
    res.status(400).json(resp);
    return;
  }

  const now = Date.now();
  db.prepare(`
    UPDATE tasks
    SET status = 'completed', completion_proof = ?, completed_at = ?
    WHERE id = ?
  `).run(body.completionProof, now, req.params.id);

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as Record<
    string,
    unknown
  >;
  const resp: ApiResponse<Task> = { success: true, data: rowToTask(updated) };
  res.json(resp);
});

/**
 * POST /tasks/:id/verify
 * Poster verifies the completed work and records the payment transaction.
 * Requires authentication by the poster.
 */
router.post("/:id/verify", authenticate, (req: Request, res: Response) => {
  const agent = (req as AuthedRequest).agent;
  const db = getDb();
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    const resp: ApiResponse = { success: false, error: "Task not found" };
    res.status(404).json(resp);
    return;
  }

  if (row.status !== "completed") {
    const resp: ApiResponse = { success: false, error: "Task must be in completed state to verify" };
    res.status(409).json(resp);
    return;
  }

  if ((row.poster_agent_id as string) !== agent.agentId) {
    const resp: ApiResponse = { success: false, error: "Only the task poster can verify completion" };
    res.status(403).json(resp);
    return;
  }

  const body = req.body as Partial<VerifyTaskRequest>;
  if (body.approved === undefined) {
    const resp: ApiResponse = { success: false, error: "approved (boolean) is required" };
    res.status(400).json(resp);
    return;
  }

  const now = Date.now();
  if (body.approved) {
    db.prepare(`
      UPDATE tasks
      SET status = 'verified', tx_hash = ?, verified_at = ?
      WHERE id = ?
    `).run(body.txHash ?? null, now, req.params.id);
  } else {
    // Rejected: reopen the task so another agent can pick it up
    db.prepare(`
      UPDATE tasks
      SET status = 'open', worker_address = NULL, worker_agent_id = NULL,
          accepted_at = NULL, completed_at = NULL, completion_proof = NULL
      WHERE id = ?
    `).run(req.params.id);
  }

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as Record<
    string,
    unknown
  >;
  const resp: ApiResponse<Task> = { success: true, data: rowToTask(updated) };
  res.json(resp);
});

/**
 * DELETE /tasks/:id
 * Cancel an open task. Only the poster can cancel.
 */
router.delete("/:id", authenticate, (req: Request, res: Response) => {
  const agent = (req as AuthedRequest).agent;
  const db = getDb();
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    const resp: ApiResponse = { success: false, error: "Task not found" };
    res.status(404).json(resp);
    return;
  }

  if ((row.poster_agent_id as string) !== agent.agentId) {
    const resp: ApiResponse = { success: false, error: "Only the task poster can cancel this task" };
    res.status(403).json(resp);
    return;
  }

  if (!["open", "accepted"].includes(row.status as string)) {
    const resp: ApiResponse = { success: false, error: "Cannot cancel a completed or verified task" };
    res.status(409).json(resp);
    return;
  }

  db.prepare("UPDATE tasks SET status = 'cancelled' WHERE id = ?").run(req.params.id);

  const resp: ApiResponse = { success: true };
  res.json(resp);
});

export default router;
