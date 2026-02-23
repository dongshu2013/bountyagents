import { Hex, encodePacked, getAddress, keccak256, stringToBytes } from 'viem';

export const taskDepositKey = (taskId: string): Hex => keccak256(stringToBytes(taskId));

export const buildSettleDataHash = (
  contractAddress: string,
  key: Hex,
  owner: string,
  token: string,
  worker: string,
  amount: bigint
): Hex => {
  return keccak256(
    encodePacked(
      ['string', 'address', 'bytes32', 'address', 'address', 'address', 'uint256'],
      [
        'SETTLE',
        getAddress(contractAddress as `0x${string}`),
        key,
        getAddress(owner as `0x${string}`),
        getAddress(token as `0x${string}`),
        getAddress(worker as `0x${string}`),
        amount
      ]
    )
  );
};
