import { Hex, encodePacked, getAddress, hexToBytes, keccak256 } from 'viem';
import { Account, privateKeyToAccount } from 'viem/accounts';
import { ServiceConfig } from './config.js';

let cachedAccount: { key: string; account: Account } | null = null;

const getAdminAccount = (privateKey: string): Account => {
  if (!cachedAccount || cachedAccount.key !== privateKey) {
    cachedAccount = {
      key: privateKey,
      account: privateKeyToAccount(privateKey as Hex)
    };
  }
  return cachedAccount.account;
};

const normalizeAddress = (value: string) => getAddress(value as `0x${string}`);

const buildWithdrawDataHash = (
  contractAddress: string,
  key: Hex,
  owner: string,
  token: string,
  amount: bigint
): Hex => {
  return keccak256(
    encodePacked(
      ['string', 'address', 'bytes32', 'address', 'address', 'uint256'],
      ['WITHDRAW', normalizeAddress(contractAddress), key, normalizeAddress(owner), normalizeAddress(token), amount]
    )
  );
};

export const signWithdrawAuthorization = async (
  config: ServiceConfig,
  key: Hex,
  owner: string,
  token: string,
  amount: bigint
): Promise<Hex> => {
  const dataHash = buildWithdrawDataHash(config.contractAddress, key, owner, token, amount);
  const account = getAdminAccount(config.adminPrivateKey);
  return account.signMessage({ message: { raw: hexToBytes(dataHash) } });
};
