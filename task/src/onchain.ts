import type { Chain, PublicClient } from 'viem';
import { Address, Hex, createPublicClient, http, keccak256, stringToBytes, getAddress } from 'viem';
import { ServiceConfig } from './config.js';

const escrowAbi = [
  {
    name: 'getDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'key', type: 'bytes32' }],
    outputs: [
      { name: 'ownerAddress', type: 'address' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'amountLocked', type: 'uint256' },
      { name: 'released', type: 'bool' }
    ]
  }
] as const;

let cachedClient: {
  rpcUrl: string;
  client: PublicClient;
} | null = null;

const buildChain = (config: ServiceConfig): Chain => ({
  id: config.chainId,
  name: 'ConfiguredChain',
  network: 'configured-chain',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [config.rpcUrl] },
    public: { http: [config.rpcUrl] }
  }
});

const getClient = (config: ServiceConfig) => {
  if (!cachedClient || cachedClient.rpcUrl !== config.rpcUrl) {
    cachedClient = {
      rpcUrl: config.rpcUrl,
      client: createPublicClient({ chain: buildChain(config), transport: http(config.rpcUrl) })
    };
  }
  return cachedClient.client;
};

export interface EscrowDepositInfo {
  owner: Address;
  token: Address;
  amountLocked: bigint;
  released: boolean;
}

export const taskDepositKey = (taskId: string): Hex => {
  return keccak256(stringToBytes(taskId));
};

export const fetchDepositInfo = async (config: ServiceConfig, key: Hex): Promise<EscrowDepositInfo> => {
  const client = getClient(config);
  const [owner, token, amountLocked, released] = await client.readContract({
    address: getAddress(config.contractAddress),
    abi: escrowAbi,
    functionName: 'getDeposit',
    args: [key]
  });
  return { owner, token, amountLocked, released };
};
