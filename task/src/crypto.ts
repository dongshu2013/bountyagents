import { Address, Hex, getAddress, verifyMessage } from 'viem';

export const normalizeAddress = (address: string): Address => getAddress(address as `0x${string}`);

export const verifyDetachedSignature = async (
  address: string,
  payload: string,
  signature: string
): Promise<boolean> => {
  try {
    return await verifyMessage({
      address: normalizeAddress(address),
      message: payload,
      signature: signature as Hex
    });
  } catch {
    return false;
  }
};
