import {
    createWalletClient,
    createPublicClient,
    http,
    defineChain,
    Chain,
  } from 'viem';
  import { privateKeyToAccount } from 'viem/accounts';
  
  /* ======================
   * 1. 動態產生 chain 物件
   * ======================
   * 支援用戶自訂 RPC/chainId/name/network/symbol
   */
  export function getDynamicChain(
    rpcUrl: string,
    options: {
      chainId?: number;
      name?: string;
      network?: string;
      nativeCurrency?: { name: string; symbol: string; decimals: number };
    } = {}
  ): Chain {
    return defineChain({
      id: options.chainId ?? 43114,
      name: options.name ?? 'Avalanche',
      network: options.network ?? 'avalanche',
      nativeCurrency:
        options.nativeCurrency ?? {
          name: 'Avalanche',
          symbol: 'AVAX',
          decimals: 18,
        },
      rpcUrls: {
        default: { http: [rpcUrl] },
        public: { http: [rpcUrl] },
      },
    });
  }
  
  /* =============================================
   * 2. 從私鑰推導臨時地址（無需主錢包驗證）
   * =============================================
   */
  export function deriveTempAddressFromPrivateKey(
    tempPrivateKey: `0x${string}`
  ): `0x${string}` {
    const account = privateKeyToAccount(tempPrivateKey);
    return account.address as `0x${string}`;
  }
  
  /* ===============================================================
   * 3. 自動贖回 + 轉帳 (完整傳遞 temp wallet, main wallet, chain)
   * ===============================================================
   */
  export async function autoRedeemAndTransfer({
    tempPrivateKey,
    tempAddress,
    mainAddress,
    vaultAddress,
    rpcUrl,
    chainOptions,
    redeemAmount,
  }: {
    tempPrivateKey: `0x${string}`;
    tempAddress: `0x${string}`;
    mainAddress: `0x${string}`;
    vaultAddress: `0x${string}`;
    rpcUrl: string;
    chainOptions?: {
      chainId?: number;
      name?: string;
      network?: string;
      nativeCurrency?: { name: string; symbol: string; decimals: number };
    };
    redeemAmount: bigint;
  }): Promise<{ redeemHash: string; transferHash: string }> {
    // ---- 產生 chain 物件 ----
    const chain = getDynamicChain(rpcUrl, chainOptions);
  
    // ---- 建 walletClient ----
    const account = privateKeyToAccount(tempPrivateKey);
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });
  
    // ---- 贖回 ----
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
  
    // ---- 查資產 token 地址 ----
    const assetTokenAddress = await getVaultAssetAddress(vaultAddress, rpcUrl, chainOptions);
  
    // ---- 轉帳資產 ----
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
  
  /* ===============================================
   * 4. 查詢 Vault 資產合約地址（支援多鏈）
   * =============================================== */
  export async function getVaultAssetAddress(
    vaultAddress: `0x${string}`,
    rpcUrl: string,
    chainOptions?: { chainId?: number; name?: string; network?: string; nativeCurrency?: { name: string; symbol: string; decimals: number } }
  ): Promise<`0x${string}`> {
    const chain = getDynamicChain(rpcUrl, chainOptions);
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

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
        ],
        functionName: 'asset',
        args: [],
        authorizationList: undefined
    });
  
    if (typeof result !== 'string' || !result.startsWith('0x')) {
      throw new Error('Vault 未給出資產 token 地址');
    }
    return result as `0x${string}`;
  }
  
  /* ====================================
   * 5. 查詢最大可贖回金額（支援多鏈）
   * ==================================== */
  export async function queryMaxRedeem(
    vaultAddress: `0x${string}`,
    tempAddress: `0x${string}`,
    rpcUrl: string,
    chainOptions?: { chainId?: number; name?: string; network?: string; nativeCurrency?: { name: string; symbol: string; decimals: number } }
  ): Promise<bigint> {
    const chain = getDynamicChain(rpcUrl, chainOptions);
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  
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
        authorizationList: undefined
    });
  
    if (typeof result !== 'bigint') {
      throw new Error('合約 maxRedeem 回傳型別錯誤（非 bigint）');
    }
    return result;
  }
  