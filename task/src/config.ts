import { config as loadEnv } from 'dotenv';

loadEnv();

export interface ServiceConfig {
  port: number;
  host: string;
  databaseUrl: string;
  contractAddress: string;
  signingAlgorithm: 'ethereum';
  publicServiceUrl?: string;
  chainId: number;
  depositNetwork: string;
  rpcUrl: string;
}

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
};

export const loadConfig = (): ServiceConfig => {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  return {
    port,
    host,
    databaseUrl: requireEnv('DATABASE_URL'),
    contractAddress: requireEnv('CONTRACT_ADDRESS'),
    signingAlgorithm: 'ethereum',
    publicServiceUrl: process.env.PUBLIC_SERVICE_URL,
    chainId: Number(process.env.CHAIN_ID ?? 8453),
    depositNetwork: process.env.DEPOSIT_NETWORK ?? 'base-mainnet',
    rpcUrl: requireEnv('CHAIN_RPC_URL')
  };
};
