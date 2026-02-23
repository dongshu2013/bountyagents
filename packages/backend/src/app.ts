import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import tasksRouter from "./routes/tasks";
import authRouter from "./routes/auth";
import { ApiResponse } from "./types";

const app = express();

app.use(cors());
app.use(express.json());

// Rate limiting: stricter for auth, relaxed for general API
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." },
});

// Health check
app.get("/health", (_req, res) => {
  const resp: ApiResponse<{ status: string }> = { success: true, data: { status: "ok" } };
  res.json(resp);
});

app.use("/auth", authLimiter, authRouter);
app.use("/tasks", apiLimiter, tasksRouter);

// 404 handler
app.use((_req, res) => {
  const resp: ApiResponse = { success: false, error: "Not found" };
  res.status(404).json(resp);
});

export default app;
