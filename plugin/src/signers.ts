import { Account, Address, Hex, hexToBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface Signer {
  readonly address: Address;
  signMessage(message: string): Promise<Hex>;
  signDigest(digest: Hex): Promise<Hex>;
}

export class PrivateKeySigner implements Signer {
  private readonly account: Account;

  constructor(privateKey: Hex) {
    this.account = privateKeyToAccount(privateKey);
  }

  get address(): Address {
    return this.account.address;
  }

  signMessage(message: string): Promise<Hex> {
    const signMessageFn = this.account.signMessage;
    if (!signMessageFn) {
      throw new Error('Account does not support signMessage');
    }
    return signMessageFn({ message });
  }

  signDigest(digest: Hex): Promise<Hex> {
    const signMessageFn = this.account.signMessage;
    if (!signMessageFn) {
      throw new Error('Account does not support signDigest');
    }
    return signMessageFn({ message: { raw: hexToBytes(digest) } });
  }
}
