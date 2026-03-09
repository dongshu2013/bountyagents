import { Type } from "@sinclair/typebox";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { taskDepositKey } from "./escrow.js";
import { json, getPrivateKey } from "./helper.js";
import { BountyAgentsPublisherPlugin } from "./index.js";
import { PrivateKeySigner } from "./signers.js";

const SERVICE_URL = "http://localhost:3000";
const CONTRACT_ADDRESS = "0x55D45aFA265d0381C8A81328FfeA408D2Dd45F40";
const TEST_TOKEN_ADDRESS = "0x56DA32693A4e6dDd0eDC932b295cb00372f37f8b";

const AGENT_ESCROW_ABI = [
  {
    inputs: [
      { name: "key", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "key", type: "bytes32" }],
    name: "getDeposit",
    outputs: [
      {
        components: [
          { name: "owner", type: "address" },
          { name: "token", type: "address" },
          { name: "amountLocked", type: "uint256" },
          { name: "released", type: "bool" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function createBountyTask(params: {
  title: string;
  content: string;
}) {
  const signer = new PrivateKeySigner(getPrivateKey());
  const plugin = new BountyAgentsPublisherPlugin(signer, {
    serviceUrl: SERVICE_URL,
    contractAddress: CONTRACT_ADDRESS,
  });

  const task = (await plugin.executeTool("bountyagents.publisher.task.create", {
    id: crypto.randomUUID(),
    title: params.title,
    content: params.content,
  })) as any;
  return task;
}

export async function fundBountyTask(params: {
  taskId: string;
  token: string;
}) {
  const signer = new PrivateKeySigner(getPrivateKey());
  const plugin = new BountyAgentsPublisherPlugin(signer, {
    serviceUrl: SERVICE_URL,
    contractAddress: CONTRACT_ADDRESS,
  });

  const task = (await plugin.executeTool("bountyagents.publisher.task.fund", {
    taskId: params.taskId,
    token: params.token,
  })) as any;
  return task;
}

export async function depositToken(params: {
  taskId: string;
  amount?: string;
}) {
  const account = privateKeyToAccount(getPrivateKey());
  const chain = bscTestnet;
  const transport = http();

  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  });

  const publicClient = createPublicClient({
    chain,
    transport,
  });

  // Fetch decimals from the token contract
  console.log(`Fetching decimals for token ${TEST_TOKEN_ADDRESS}...`);
  const decimals = await publicClient.readContract({
    address: TEST_TOKEN_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  console.log(`Token decimals: ${decimals}`);

  const amount = parseUnits(params.amount || "100", decimals);

  const depositKey = taskDepositKey(params.taskId);
  console.log(`Deposit key: ${depositKey}`);

  // 1. Approve
  console.log(`Approving ${params.amount || "100"} tokens...`);
  const approveHash = await walletClient.writeContract({
    address: TEST_TOKEN_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [CONTRACT_ADDRESS as `0x${string}`, amount],
  });
  console.log(`Approve transaction sent: ${approveHash}`);
  console.log(`Waiting for confirmation...`);
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`Approve confirmed!`);

  // 2. Deposit
  console.log(`Depositing tokens into AgentEscrow...`);
  const depositHash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: AGENT_ESCROW_ABI,
    functionName: "deposit",
    args: [depositKey, TEST_TOKEN_ADDRESS as `0x${string}`, amount],
  });

  await publicClient.waitForTransactionReceipt({ hash: depositHash });
  console.log(`Deposit confirmed!`);

  const depositInfo = await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: AGENT_ESCROW_ABI,
    functionName: "getDeposit",
    args: [depositKey],
  });

  return {
    message: `Successfully deposited ${params.amount || "100"} test tokens`,
    taskId: params.taskId,
    approveTransactionHash: approveHash,
    depositTransactionHash: depositHash,
    rawAmount: amount.toString(),
    rawLockedAmount: depositInfo.amountLocked.toString(),
  };
}

export async function decideOnResponse(params: {
  responseId: string;
  workerAddress: string;
  price: string;
  status: "approved" | "rejected";
}) {
  const signer = new PrivateKeySigner(getPrivateKey());
  const plugin = new BountyAgentsPublisherPlugin(signer, {
    serviceUrl: SERVICE_URL,
    contractAddress: CONTRACT_ADDRESS,
  });

  const response = (await plugin.executeTool(
    "bountyagents.publisher.task.decision",
    params
  )) as any;
  return response;
}

export function registerPublisherTools(api: any) {
  api.registerTool({
    name: "create_bounty_task",
    description:
      "Create a draft bounty task for an agent based on user request, tell user to give title and content of the task, and return the created task id to user if successful",
    parameters: Type.Object({
      title: Type.String(),
      content: Type.String(),
    }),
    async execute(_id: string, params: any) {
      try {
        const result = await createBountyTask(params);
        return json(result);
      } catch (error: any) {
        return json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  api.registerTool({
    name: "deposit_token",
    description:
      "Deposit tokens into the AgentEscrow contract for a specific task. The token must be in the format 'network:address'.",
    parameters: Type.Object({
      taskId: Type.String(),
      token: Type.String(),
      amount: Type.Optional(Type.String()),
    }),
    async execute(_id: string, params: any) {
      try {
        const result = await depositToken(params);
        return json(result);
      } catch (error: any) {
        return json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  api.registerTool({
    name: "fund_bounty_task",
    description:
      "Fund a draft bounty task, attaching token metadata to it. The token must be in the format 'network:address'.",
    parameters: Type.Object({
      taskId: Type.String(),
      token: Type.String(),
    }),
    async execute(_id: string, params: any) {
      try {
        const result = await fundBountyTask(params);
        return json(result);
      } catch (error: any) {
        return json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  api.registerTool({
    name: "decide_on_response",
    description: "Approve or reject a task response.",
    parameters: Type.Object({
      responseId: Type.String(),
      workerAddress: Type.String(),
      price: Type.String(),
      status: Type.Union([
        Type.Literal("approved"),
        Type.Literal("rejected"),
      ]),
    }),
    async execute(_id: string, params: any) {
      try {
        const result = await decideOnResponse(params);
        return json(result);
      } catch (error: any) {
        return json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
