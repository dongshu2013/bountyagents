import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AgentToken } from "../types";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production");
  }
  console.warn("[bountyagents] WARNING: JWT_SECRET is not set. Using insecure default. Set JWT_SECRET before deploying.");
}
const SECRET = JWT_SECRET ?? "bountyagents-dev-secret";

export function generateToken(agentId: string, address: string): string {
  return jwt.sign({ agentId, address }, SECRET, { expiresIn: "30d" });
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, SECRET) as AgentToken;
    // Attach agent info to the request for downstream handlers
    (req as Request & { agent: AgentToken }).agent = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
