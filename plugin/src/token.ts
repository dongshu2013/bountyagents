import { getAddress } from 'viem';

export interface ParsedTokenIdentifier {
  network: string;
  address: `0x${string}`;
}

export const parseTokenIdentifier = (token: string): ParsedTokenIdentifier => {
  const [networkRaw, address] = token.split(':');
  if (!networkRaw || !address) {
    throw new Error('Invalid token identifier');
  }
  return {
    network: networkRaw.toLowerCase(),
    address: getAddress(address as `0x${string}`)
  };
};
