import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface MetaMaskContextType {
  isConnected: boolean;
  account: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

export class MetaMaskService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
    }
  }

  async connect(): Promise<string> {
    if (!this.provider) {
      throw new Error('MetaMask not available');
    }

    const accounts = await this.provider.send('eth_requestAccounts', []);
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    return accounts[0];
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer not available');
    }

    return await this.signer.signMessage(message);
  }

  async getAccount(): Promise<string | null> {
    if (!this.provider) return null;
    
    try {
      const accounts = await this.provider.listAccounts();
      return accounts.length > 0 ? accounts[0].address : null;
    } catch {
      return null;
    }
  }

  async getNetwork(): Promise<{ chainId: number; name: string }> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    const network = await this.provider.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name
    };
  }
}
