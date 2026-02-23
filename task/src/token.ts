import { getAddress } from 'viem';

export interface ParsedTokenIdentifier {
  network: string;
  address: `0x${string}`;
}

export const parseTokenIdentifier = (token: string): ParsedTokenIdentifier => {
  const [networkRaw, address] = token.split(':');
  const network = networkRaw?.toLowerCase();
  if (!network || !address) {
    throw new Error('Invalid token identifier');
  }
  return { network, address: getAddress(address as `0x${string}`) };
};
