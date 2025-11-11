/**
 * 驗證與安全檢查工具函數
 */

import { createPublicClient, http, formatUnits } from 'viem';

/**
 * 驗證以太坊地址格式
 */
export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * 驗證私鑰格式
 */
export function isValidPrivateKey(privateKey: string): boolean {
  let pk = privateKey.trim();
  if (pk.length === 64) pk = '0x' + pk;
  return /^0x[0-9a-fA-F]{64}$/.test(pk);
}

/**
 * 標準化私鑰格式（自動加上 0x）
 */
export function normalizePrivateKey(privateKey: string): `0x${string}` {
  let pk = privateKey.trim();
  if (pk.length === 64) pk = '0x' + pk;
  return pk as `0x${string}`;
}

/**
 * 檢查地址餘額（原生代幣，如 ETH/AVAX）
 */
export async function checkNativeBalance(
  address: `0x${string}`,
  rpcUrl: string
): Promise<{ balance: bigint; balanceFormatted: string; hasBalance: boolean }> {
  try {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    const balance = await publicClient.getBalance({ address });
    const balanceFormatted = formatUnits(balance, 18);
    const hasBalance = balance > 0n;

    return { balance, balanceFormatted, hasBalance };
  } catch (error) {
    throw new Error(`無法查詢餘額: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 檢查 Vault 合約是否符合 ERC-4626 標準
 */
export async function validateVaultContract(
  vaultAddress: `0x${string}`,
  rpcUrl: string
): Promise<{ isValid: boolean; assetAddress?: string; error?: string }> {
  try {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    // 嘗試呼叫 ERC-4626 的 asset() 函數
    const assetAddress = await publicClient.readContract({
      address: vaultAddress,
      abi: [
        {
          name: 'asset',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ type: 'address' }],
        },
      ],
      functionName: 'asset',
    });

    if (typeof assetAddress === 'string' && assetAddress.startsWith('0x')) {
      return { isValid: true, assetAddress };
    }

    return { isValid: false, error: 'Vault 未回傳有效的 asset 地址' };
  } catch (error) {
    return {
      isValid: false,
      error: `Vault 驗證失敗: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 驗證 RPC 連接性
 */
export async function validateRpcConnection(rpcUrl: string): Promise<{
  isValid: boolean;
  chainId?: number;
  blockNumber?: bigint;
  error?: string;
}> {
  try {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    const [chainId, blockNumber] = await Promise.all([
      publicClient.getChainId(),
      publicClient.getBlockNumber(),
    ]);

    return { isValid: true, chainId, blockNumber };
  } catch (error) {
    return {
      isValid: false,
      error: `RPC 連接失敗: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 友善的錯誤訊息轉換
 */
export function getFriendlyErrorMessage(error: unknown): string {
  const errorMsg = error instanceof Error ? error.message : String(error);

  if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
    return '❌ 網路連接失敗，請檢查 RPC 是否正常';
  }
  
  if (errorMsg.includes('insufficient funds') || errorMsg.includes('insufficient balance')) {
    return '❌ 餘額不足，請充值 Gas 代幣';
  }
  
  if (errorMsg.includes('gas required exceeds allowance')) {
    return '❌ Gas 限制不足，請調整 Gas 設定';
  }
  
  if (errorMsg.includes('revert') || errorMsg.includes('execution reverted')) {
    return '❌ 合約執行失敗，請確認參數是否正確';
  }
  
  if (errorMsg.includes('nonce')) {
    return '❌ Nonce 錯誤，可能有待處理的交易';
  }

  return `❌ 錯誤: ${errorMsg}`;
}

/**
 * 估算 Gas 成本（粗略估算）
 */
export async function estimateGasCost(
  rpcUrl: string
): Promise<{ gasPriceGwei: string; estimatedCostEth: string }> {
  try {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    const gasPrice = await publicClient.getGasPrice();
    const gasPriceGwei = formatUnits(gasPrice, 9); // Convert to Gwei
    
    // 假設贖回+轉帳需要約 200,000 gas
    const estimatedGas = 200000n;
    const estimatedCost = gasPrice * estimatedGas;
    const estimatedCostEth = formatUnits(estimatedCost, 18);

    return { gasPriceGwei, estimatedCostEth };
  } catch (error) {
    throw new Error(`無法估算 Gas: ${error instanceof Error ? error.message : String(error)}`);
  }
}
