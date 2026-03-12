import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { privateKeyToAccount } from "viem/accounts";
import { PrivateKeySigner } from "./signers.js";
import { CONFIG } from "./config.js";

export function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

export const KEY_PATH = path.join(os.homedir(), ".bountyagents_key");

export function getPrivateKey(): `0x${string}` | null {
  try {
    if (fs.existsSync(KEY_PATH)) {
      const key = fs.readFileSync(KEY_PATH, "utf-8").trim();
      if (key.startsWith("0x")) {
        return key as `0x${string}`;
      }
    }
  } catch (error) {
    return null;
  }
  // Fallback to the default one if the file doesn't exist to not break existing functionality directly, but throw error if user wants to use init
  return null;
}

export function getWalletAddress(): string | null {
  try {
    const privateKey = getPrivateKey();
    if (!privateKey) {
      return null;
    }
    return privateKeyToAccount(privateKey).address;
  } catch (error) {
    return null;
  }
}

export async function getDashboardUrl(): Promise<{
  url: string;
  token: string;
}> {
  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error("Private key not found");
  }
  const signer = new PrivateKeySigner(privateKey);
  const message = `login-${Date.now()}`;
  const signature = await signer.signMessage(message);

  const response = await fetch(`${CONFIG.serviceUrl}/request-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: signer.address,
      message,
      signature,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to request token: ${errorText}`);
  }

  const { token } = (await response.json()) as { token: string };
  return { url: `${CONFIG.dashboardUrl}?token=${token}`, token: token };
}
