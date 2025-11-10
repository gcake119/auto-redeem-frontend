import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/* ========== 從私鑰生成臨時錢包地址（不需核對） ========== */
/**
 * @param tempPrivateKey 臨時錢包私鑰（0x 開頭）
 * @returns 生成的臨時錢包地址
 * @throws 若私鑰無效則拋出錯誤
 */
export function deriveTempAddressFromPrivateKey(
  tempPrivateKey: `0x${string}`
): `0x${string}` {
  try {
    const account = privateKeyToAccount(tempPrivateKey);
    return account.address;
  } catch (e) {
    throw new Error('私鑰無效，無法生成地址');
  }
}

/* ========== 自動贖回至臨時錢包，再自動轉帳贖回金額到主錢包 ========== */
/**
 * @param tempPrivateKey 臨時錢包私鑰
 * @param tempAddress 臨時錢包地址（由私鑰推導）
 * @param mainAddress 主錢包地址（救援資金的目標地址）
 * @param vaultAddress ERC-4626 Vault 合約地址
 * @param rpcUrl 鏈的 RPC 網址
 * @param redeemAmount 欲贖回的份額
 * @returns { redeemHash, transferHash }
 */
export async function autoRedeemAndTransfer({
  tempPrivateKey,
  tempAddress,
  mainAddress,
  vaultAddress,
  rpcUrl,
  redeemAmount,
}: {
  tempPrivateKey: `0x${string}`;
  tempAddress: `0x${string}`;
  mainAddress: `0x${string}`;
  vaultAddress: `0x${string}`;
  rpcUrl: string;
  redeemAmount: bigint;
}): Promise<{ redeemHash: string; transferHash: string }> {
  // -------- 1. 建立臨時錢包 client --------
  const account = privateKeyToAccount(tempPrivateKey);
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });

  // -------- 2. 自動贖回到臨時錢包地址 --------
  const redeemHash = await walletClient.writeContract({
    address: vaultAddress,
    abi: [
      {
        name: 'redeem',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'shares', type: 'uint256' },
          { name: 'receiver', type: 'address' },
          { name: 'owner', type: 'address' },
        ],
        outputs: [{ type: 'uint256' }],
      },
    ] as const,
    functionName: 'redeem',
    args: [redeemAmount, tempAddress, tempAddress],
  });

  // -------- 3. 查詢 Vault 底層資產（ERC20 token） --------
  const assetTokenAddress = await getVaultAssetAddress(vaultAddress, rpcUrl);

  // -------- 4. 自動轉帳贖回的資產到主錢包 --------
  const transferHash = await walletClient.writeContract({
    address: assetTokenAddress,
    abi: [
      {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
      },
    ] as const,
    functionName: 'transfer',
    args: [mainAddress, redeemAmount],
  });

  return { redeemHash, transferHash };
}

/* ========== 查詢 Vault 資產合約地址 ========== */
export async function getVaultAssetAddress(
  vaultAddress: `0x${string}`,
  rpcUrl: string
): Promise<`0x${string}`> {
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const result = await publicClient.readContract({
    address: vaultAddress,
    abi: [
      {
        name: 'asset',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'address' }],
      },
    ] as const,
    functionName: 'asset',
    args: [],
  });

  if (typeof result !== 'string' || !result.startsWith('0x')) {
    throw new Error('Vault 未給出資產 token 地址');
  }
  return result as `0x${string}`;
}

/* ========== 查詢最大可贖回金額 ========== */
export async function queryMaxRedeem(
  vaultAddress: `0x${string}`,
  tempAddress: `0x${string}`,
  rpcUrl: string
): Promise<bigint> {
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const result = await publicClient.readContract({
    address: vaultAddress,
    abi: [
      {
        name: 'maxRedeem',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
    ] as const,
    functionName: 'maxRedeem',
    args: [tempAddress],
  });

  if (typeof result !== 'bigint') {
    throw new Error('合約 maxRedeem 回傳型別錯誤（非 bigint）');
  }
  return result;
}
