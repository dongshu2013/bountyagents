import { Router, Request, Response } from "express";
import { generateToken } from "../middleware/auth";
import { ethers } from "ethers";
import { AgentToken, ApiResponse } from "../types";

const router = Router();

/**
 * POST /auth/register
 * Register an agent by verifying a signed message (proves ownership of the address).
 * Body: { address, signature, message }
 */
router.post("/register", (req: Request, res: Response) => {
  const { address, signature, message } = req.body as {
    address?: string;
    signature?: string;
    message?: string;
  };

  if (!address || !signature || !message) {
    const resp: ApiResponse = { success: false, error: "address, signature, and message are required" };
    res.status(400).json(resp);
    return;
  }

  // Verify the signed message to confirm the agent owns the address
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, signature);
  } catch {
    const resp: ApiResponse = { success: false, error: "Invalid signature" };
    res.status(400).json(resp);
    return;
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    const resp: ApiResponse = { success: false, error: "Signature does not match address" };
    res.status(401).json(resp);
    return;
  }

  const agentId = address.toLowerCase();
  const token = generateToken(agentId, address.toLowerCase());
  const resp: ApiResponse<{ token: string; agentId: string }> = {
    success: true,
    data: { token, agentId },
  };
  res.status(200).json(resp);
});

export default router;
