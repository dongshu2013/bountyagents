import { config as loadEnv } from 'dotenv';

loadEnv();

export interface ServiceConfig {
  port: number;
  host: string;
  databaseUrl: string;
  contractAddress: string;
  signingAlgorithm: 'ethereum';
  chainId: number;
  rpcUrl: string;
  adminPrivateKey: string;
  depositNetwork: string;
}

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
};

const inferDepositNetwork = (chainId: number): string => {
  switch (chainId) {
    case 8453:
      return 'base-mainnet';
    case 84532:
      return 'base-sepolia';
    case 97:
      return 'bsc-testnet';
    case 56:
      return 'bsc-mainnet';
    case 1:
      return 'eth-mainnet';
    default:
      return `chain-${chainId}`;
  }
};

export const loadConfig = (): ServiceConfig => {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  const chainId = Number(process.env.CHAIN_ID ?? 8453);
  return {
    port,
    host,
    databaseUrl: requireEnv('DATABASE_URL'),
    contractAddress: requireEnv('CONTRACT_ADDRESS'),
    signingAlgorithm: 'ethereum',
    chainId,
    rpcUrl: requireEnv('CHAIN_RPC_URL'),
    adminPrivateKey: requireEnv('ADMIN_PRIVATE_KEY'),
    depositNetwork: inferDepositNetwork(chainId)
  };
};

export const deriveDepositNetwork = inferDepositNetwork;
