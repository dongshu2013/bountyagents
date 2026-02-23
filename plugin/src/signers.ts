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
    return this.account.signMessage({ message });
  }

  signDigest(digest: Hex): Promise<Hex> {
    return this.account.signMessage({ message: { raw: hexToBytes(digest) } });
  }
}
