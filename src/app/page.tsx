'use client';

import { useState, useEffect } from 'react';
import { Wallet, Lock, Shield, FileText } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { MetaMaskService } from '@/lib/metamask';
import { FHEEncryption, EncryptedFile } from '@/lib/fhe-encryption';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encryptedFiles, setEncryptedFiles] = useState<EncryptedFile[]>([]);
  const [metaMaskService] = useState(() => new MetaMaskService());

  useEffect(() => {
    initializeMetaMask();
  }, []);

  const initializeMetaMask = async () => {
    try {
      await metaMaskService.initialize();
      const currentAccount = await metaMaskService.getAccount();
      if (currentAccount) {
        setAccount(currentAccount);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to initialize MetaMask:', error);
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connectedAccount = await metaMaskService.connect();
      setAccount(connectedAccount);
      setIsConnected(true);
    } catch (error: any) {
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setError(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!isConnected || !account) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Sign the file for encryption
      const message = `Encrypt file: ${file.name} (${file.size} bytes)`;
      const signature = await metaMaskService.signMessage(message);
      
      // Get network info
      const network = await metaMaskService.getNetwork();
      
      // Encrypt the file
      const encryptedFile = await FHEEncryption.encryptFile(
        file,
        signature,
        account,
        network.chainId
      );

      // Store the encrypted file
      setEncryptedFiles(prev => [...prev, encryptedFile]);
      
      console.log('File encrypted and stored:', encryptedFile);
    } catch (error: any) {
      setError(error.message || 'Failed to encrypt file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDecrypt = async (encryptedFile: EncryptedFile) => {
    if (!isConnected || !account) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Sign the decryption request
      const message = `Decrypt file: ${encryptedFile.metadata.originalName}`;
      const signature = await metaMaskService.signMessage(message);
      
      // Get network info
      const network = await metaMaskService.getNetwork();
      
      // Decrypt the file
      const decryptedData = await FHEEncryption.decryptFile(
        encryptedFile,
        signature,
        account,
        network.chainId
      );

      if (decryptedData) {
        // Create download link
        const blob = new Blob([decryptedData]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = encryptedFile.metadata.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setError('Failed to decrypt file');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to decrypt file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">CloudFHE</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Secure file storage with Fully Homomorphic Encryption (FHE) powered by Zama Protocol
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="max-w-md mx-auto mb-8">
          {!isConnected ? (
            <button
              onClick={connectWallet}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  <span>Connect MetaMask</span>
                </>
              )}
            </button>
          ) : (
            <div className="bg-white rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* File Upload */}
        {isConnected && (
          <div className="mb-12">
            <FileUpload
              onFileUpload={handleFileUpload}
              isUploading={isLoading}
            />
          </div>
        )}

        {/* Encrypted Files List */}
        {isConnected && encryptedFiles.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Your Encrypted Files
            </h2>
            <div className="grid gap-4">
              {encryptedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-white rounded-lg p-6 shadow-md border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {file.metadata.originalName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {(file.metadata.size / 1024).toFixed(2)} KB • 
                          Uploaded {new Date(file.metadata.uploadDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          Chain ID: {file.chainId} • 
                          Hash: {file.metadata.hash.slice(0, 16)}...
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFileDecrypt(file)}
                      disabled={isLoading}
                      className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Decrypt & Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Why Choose CloudFHE?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                FHE Encryption
              </h3>
              <p className="text-gray-600">
                Your files are encrypted using Zama's Fully Homomorphic Encryption technology
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                MetaMask Integration
              </h3>
              <p className="text-gray-600">
                Secure transactions and file access control through MetaMask wallet
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Secure Storage
              </h3>
              <p className="text-gray-600">
                Files are stored with cryptographic signatures and access control
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
