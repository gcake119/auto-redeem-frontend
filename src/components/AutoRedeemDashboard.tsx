"use client";

import { useState, useRef, useEffect } from "react";
import PrivateKeyInput from "./PrivateKeyInput";
import { formatUnits } from "viem";
import {
  autoRedeemAndTransfer,
  queryMaxRedeem
} from "../hooks/PrivateKeyAutoSigner";

/* ========== 1. 起始環境初值與狀態 ========== */
const RPC_GUIDE_LINK = "https://chainlist.org/";
const VAULT_GUIDE_LINK = "https://snowtrace.io/";

// 安全的 RPC 白名單（常用公共 RPC）
const TRUSTED_RPC_ENDPOINTS = [
  "https://api.avax.network/ext/bc/C/rpc",
  "https://avalanche.public-rpc.com",
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum.publicnode.com",
  "https://arb1.arbitrum.io/rpc",
  "https://arbitrum.llamarpc.com",
  "https://polygon-rpc.com",
  "https://rpc-mainnet.matic.network",
];

const DEFAULT_CHAIN_LIST = [
  {
    name: "Avalanche （預設 Vault 為 K3 USDT Earn Vault）",
    rpc: "https://api.avax.network/ext/bc/C/rpc",
    exampleVault: "0xE1A62FDcC6666847d5EA752634E45e134B2F824B",
  },
  {
    name: "Ethereum Mainnet",
    rpc: "https://eth.llamarpc.com",
    exampleVault: "0x...",
  },
  {
    name: "Arbitrum",
    rpc: "https://arb1.arbitrum.io/rpc",
    exampleVault: "0x...",
  },
];

export default function AutoRedeemDashboard() {
  const [rpcUrl, setRpcUrl] = useState(DEFAULT_CHAIN_LIST[0].rpc);
  const [vaultAddress, setVaultAddress] = useState(DEFAULT_CHAIN_LIST[0].exampleVault);


  // 主錢包地址 + 臨時錢包地址 + 臨時錢包私鑰
  const [mainAddress, setMainAddress] = useState('');
  const [tempAddress, setTempAddress] = useState('');
  const [tempPrivateKey, setTempPrivateKey] = useState('');

  // 新增：安全確認狀態
  const [hasReadWarnings, setHasReadWarnings] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 監控贖回狀態
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [redeemableAmount, setRedeemableAmount] = useState<bigint>(0n);
  const [lastRedeemHash, setLastRedeemHash] = useState<string | undefined>(undefined);
  const [lastTransferHash, setLastTransferHash] = useState<string | undefined>(undefined);
  
  // 新增：失敗計數與交易防護
  const [failureCount, setFailureCount] = useState(0);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const [rpcWarning, setRpcWarning] = useState('');
  const [customRpcConfirmed, setCustomRpcConfirmed] = useState(false);
  const [rpcConfirmText, setRpcConfirmText] = useState('');
  const [vaultValidation, setVaultValidation] = useState<{
    isValid: boolean;
    assetAddress?: string;
    error?: string;
  } | null>(null);
  const [isValidatingVault, setIsValidatingVault] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const MAX_FAILURES = 5; // 連續失敗 5 次自動停止
  const inactivityTimerRef = useRef<number | null>(null);
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 分鐘

  /* ========== 私鑰清除機制 ========== */
  const clearPrivateKeyFromMemory = () => {
    setTempPrivateKey('');
    setTempAddress('');
    setMainAddress('');
    setRedeemableAmount(0n);
    setLastRedeemHash(undefined);
    setLastTransferHash(undefined);
    setFailureCount(0);
    setIsProcessingTransaction(false);
    
    // 清除不活動計時器
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // 清除狀態後，React 會自動進行垃圾回收
    console.log('私鑰已從記憶體清除');
  };
  
  /* ========== 重置不活動計時器 ========== */
  const resetInactivityTimer = () => {
    // 清除舊的計時器
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // 只在有私鑰且未運行時設置計時器
    if (tempPrivateKey && !isRunning) {
      inactivityTimerRef.current = window.setTimeout(() => {
        console.log('10 分鐘無操作，自動清除私鑰');
        clearPrivateKeyFromMemory();
        setError('閒置時間過長，私鑰已自動清除。如需繼續請重新輸入。');
      }, INACTIVITY_TIMEOUT);
    }
  };
  
  // 監聽使用者操作以重置計時器
  useEffect(() => {
    if (!tempPrivateKey) return;
    
    const handleActivity = () => {
      resetInactivityTimer();
    };
    
    // 監聽各種使用者活動
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    
    // 初始設置計時器
    resetInactivityTimer();
    
    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [tempPrivateKey, isRunning]);

  // 頁面卸載時自動清除私鑰
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearPrivateKeyFromMemory();
    };

    const handleVisibilityChange = () => {
      // 當頁面隱藏時（切換分頁、最小化），可選擇清除私鑰
      if (document.hidden && !isRunning) {
        // 只在未運行時清除（避免中斷運行中的任務）
        console.log('頁面隱藏，建議手動停止運行');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearPrivateKeyFromMemory();
    };
  }, [isRunning]);

  /* ========== RPC 安全檢查 ========== */
  const checkRpcSafety = (url: string) => {
    const isTrusted = TRUSTED_RPC_ENDPOINTS.includes(url);
    if (!isTrusted) {
      setRpcWarning('警告：你使用的是自定義 RPC 端點。請確保此 RPC 來源可信，惡意 RPC 可能竊取交易資訊或回傳假數據！');
      setCustomRpcConfirmed(false);
      setRpcConfirmText('');
    } else {
      setRpcWarning('');
      setCustomRpcConfirmed(true);
    }
  };

  useEffect(() => {
    checkRpcSafety(rpcUrl);
  }, [rpcUrl]);
  
  /* ========== 取得區塊鏈瀏覽器 URL ========== */
  const getExplorerUrl = (txHash: string): string => {
    // 根據 RPC URL 判斷鏈
    if (rpcUrl.includes('avax') || rpcUrl.includes('avalanche')) {
      return `https://snowtrace.io/tx/${txHash}`;
    } else if (rpcUrl.includes('arbitrum') || rpcUrl.includes('arb')) {
      return `https://arbiscan.io/tx/${txHash}`;
    } else if (rpcUrl.includes('polygon') || rpcUrl.includes('matic')) {
      return `https://polygonscan.com/tx/${txHash}`;
    } else {
      // 預設使用 Etherscan
      return `https://etherscan.io/tx/${txHash}`;
    }
  };
  
  /* ========== 取得區塊鏈瀏覽器資訊 ========== */
  const getExplorerInfo = (address: string): { name: string; url: string } => {
    // 根據 RPC URL 判斷鏈
    if (rpcUrl.includes('avax') || rpcUrl.includes('avalanche')) {
      return {
        name: 'Snowtrace (Avalanche)',
        url: `https://snowtrace.io/address/${address}`
      };
    } else if (rpcUrl.includes('arbitrum') || rpcUrl.includes('arb')) {
      return {
        name: 'Arbiscan (Arbitrum)',
        url: `https://arbiscan.io/address/${address}`
      };
    } else if (rpcUrl.includes('polygon') || rpcUrl.includes('matic')) {
      return {
        name: 'Polygonscan (Polygon)',
        url: `https://polygonscan.com/address/${address}`
      };
    } else {
      // 預設使用 Etherscan
      return {
        name: 'Etherscan (Ethereum)',
        url: `https://etherscan.io/address/${address}`
      };
    }
  };
  
  /* ========== 過濾錯誤訊息中的敏感資訊 ========== */
  const sanitizeErrorMessage = (errorMsg: string): string => {
    // 移除所有 0x 開頭的地址（40個十六進位字元）
    let sanitized = errorMsg.replace(/0x[a-fA-F0-9]{40}/g, '0x...[已隱藏]');
    
    // 移除可能的私鑰片段（64個十六進位字元）
    sanitized = sanitized.replace(/[a-fA-F0-9]{64}/g, '[已隱藏]');
    
    // 移除可能的交易 hash（64個十六進位字元）
    sanitized = sanitized.replace(/0x[a-fA-F0-9]{64}/g, '0x...[交易hash已隱藏]');
    
    return sanitized;
  };

  /* ========== 2. 處理私鑰輸入與驗證 ========== */
  const handleSetPrivateKey = (mainAddr: string, pk: string, tempAddr: string) => {
    setMainAddress(mainAddr);
    setTempPrivateKey(pk);
    setTempAddress(tempAddr);
    setError('');
    setFailureCount(0);
  };

  /* ========== 2.5 啟動前檢查 ========== */
  const handleStartBot = async () => {
    setError('');
    
    // 檢查臨時錢包餘額
    try {
      const { checkNativeBalance } = await import('../utils/validation');
      const balanceCheck = await checkNativeBalance(tempAddress as `0x${string}`, rpcUrl);
      
      if (!balanceCheck.hasBalance) {
        setError('臨時錢包 Gas 餘額為 0，請先充值少量原生代幣（如 AVAX/ETH）以支付交易手續費');
        return;
      }
      
      // 顯示餘額資訊
      console.log(`臨時錢包餘額: ${balanceCheck.balanceFormatted} (原生代幣)`);
      
      // 檢查通過，啟動機器人
      setIsRunning(true);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`無法檢查錢包餘額: ${sanitizeErrorMessage(errorMsg)}`);
    }
  };

  /* ========== 2.6 驗證 Vault 合約 ========== */
  const handleValidateVault = async () => {
    if (!vaultAddress || vaultAddress.length !== 42) {
      setVaultValidation({ isValid: false, error: '請輸入有效的合約地址' });
      return;
    }

    setIsValidatingVault(true);
    setVaultValidation(null);

    try {
      const { validateVaultContract } = await import('../utils/validation');
      const result = await validateVaultContract(vaultAddress as `0x${string}`, rpcUrl);
      setVaultValidation(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setVaultValidation({ isValid: false, error: errorMsg });
    } finally {
      setIsValidatingVault(false);
    }
  };

  // 當 Vault 地址或 RPC 改變時，重置驗證狀態
  useEffect(() => {
    setVaultValidation(null);
  }, [vaultAddress, rpcUrl]);

  /* ========== 3. 自動輪詢贖回核心邏輯（優化版）========== */
  useEffect(() => {
    if (!isRunning || !tempPrivateKey || !tempAddress || !vaultAddress || !rpcUrl)
      return;

    setError('');

    // 清除舊的 interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 智能輪詢間隔：初始 2 秒，發現流動性後加速到 0.8 秒
    let pollingInterval = redeemableAmount > 0n ? 800 : 2000;

    intervalRef.current = window.setInterval(async () => {
      // 如果正在處理交易，跳過這次輪詢
      if (isProcessingTransaction) {
        console.log('⏳ 交易處理中，跳過本次輪詢...');
        return;
      }

      // 檢查失敗次數
      if (failureCount >= MAX_FAILURES) {
        setError(`❌ 連續失敗 ${MAX_FAILURES} 次，自動停止運行。請檢查網路、RPC 或 Vault 設定。`);
        setIsRunning(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      try {
        // 步驟 1：查詢臨時錢包在 vault 的最大可贖回金額
        const maxRedeem = await queryMaxRedeem(
          vaultAddress as `0x${string}`,
          tempAddress as `0x${string}`,
          rpcUrl
        );
        setRedeemableAmount(maxRedeem);

        // 重置失敗計數（查詢成功）
        if (failureCount > 0) {
          setFailureCount(0);
        }

        // 步驟 2：若有可贖回金額，自動執行贖回 + 轉帳
        if (maxRedeem > 0n) {
          console.log('🚀 偵測到可贖回金額，開始自動贖回 + 轉帳...');
          
          // 設定交易處理中標記（防止重複交易）
          setIsProcessingTransaction(true);

          try {
            const { redeemHash, transferHash } = await autoRedeemAndTransfer({
              tempPrivateKey: tempPrivateKey as `0x${string}`,
              tempAddress: tempAddress as `0x${string}`,
              mainAddress: mainAddress as `0x${string}`,
              vaultAddress: vaultAddress as `0x${string}`,
              rpcUrl,
              redeemAmount: maxRedeem,
            });

            // 步驟 3：更新 UI 顯示交易 hash
            setLastRedeemHash(redeemHash);
            setLastTransferHash(transferHash);
            console.log('✅ 贖回交易:', redeemHash);
            console.log('✅ 轉帳交易:', transferHash);
            
            // 交易成功，重置失敗計數
            setFailureCount(0);
            
            // 顯示成功訊息
            setShowSuccessMessage(true);
            
            // 交易成功後立即清除私鑰（安全考量）
            console.log('交易完成，正在清除私鑰...');
            setTimeout(() => {
              clearPrivateKeyFromMemory();
              setIsRunning(false);
            }, 3000); // 延遲 3 秒讓使用者看到交易 hash
            
          } catch (txError) {
            // 交易失敗處理
            const txErrorMsg = txError instanceof Error ? txError.message : String(txError);
            setError(`交易執行失敗: ${sanitizeErrorMessage(txErrorMsg)}`);
            console.error('Transaction Error:', txError);
            
            // 增加失敗計數
            setFailureCount(prev => prev + 1);
            
          } finally {
            // 無論成功失敗，解除交易處理標記
            setIsProcessingTransaction(false);
          }
        }
      } catch (e) {
        // 查詢失敗處理
        const errorMsg = e instanceof Error ? e.message : String(e);
        
        // 友善的錯誤訊息
        let friendlyError = '⚠️ 輪詢失敗: ';
        if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
          friendlyError += '網路連接失敗，請檢查 RPC 是否正常';
        } else if (errorMsg.includes('revert') || errorMsg.includes('execution')) {
          friendlyError += 'Vault 合約呼叫失敗，請確認合約地址正確';
        } else {
          friendlyError += errorMsg;
        }
        
        setError(friendlyError);
        console.error('Polling Error:', e);
        
        // 增加失敗計數
        setFailureCount(prev => prev + 1);
      }
    }, pollingInterval);

    // Cleanup：停止時清除 interval
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tempPrivateKey, tempAddress, vaultAddress, rpcUrl, mainAddress, redeemableAmount, failureCount, isProcessingTransaction]);

  /* ========== 4. 停止自動贖回 ========== */
  const handleStopBot = () => {
    setIsRunning(false);
    setRedeemableAmount(0n);
    setFailureCount(0);
    setIsProcessingTransaction(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /* ========== 5. 切換錢包 ========== */
  const handleClearPrivateKey = () => {
    handleStopBot();
    clearPrivateKeyFromMemory();
  };

  /* ========== UI 表單與流程 ========== */
  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* --- 頁面標題 & 說明 --- */}
      <div className="mb-16 mt-8 text-center bg-white p-10 md:p-16">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">自動贖回救援工具</h1>
        <p className="text-gray-600 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
          使用臨時錢包自動偵測 ERC-4626 Vault 流動性資金
        </p>
      </div>

      {/* 錢包提示與安全確認 */}
      <div className="mb-16 mt-12">
        <div className="space-y-10">
          {/* 警告區塊 */}
          <div className="bg-yellow-50 p-8 md:p-12 my-8">
            <h3 className="font-bold mb-8 text-2xl text-gray-900 flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              重要安全警告 - 使用前必讀
            </h3>
            <ul className="list-disc pl-8 space-y-6 text-base leading-loose text-gray-800">
              <li>
                <b className="text-gray-900">私鑰風險：</b>此工具會在瀏覽器前端處理臨時錢包私鑰。
                若環境被惡意軟體或駭客攻擊，私鑰可能被竊取。
              </li>
              <li>
                <b className="text-gray-900">僅限臨時錢包：</b>請<span className="font-bold underline text-red-600">絕對不要</span>使用主錢包或存有大量資產的錢包私鑰。
                只能使用專為此次救援創建的一次性臨時錢包。
              </li>
              <li>
                <b className="text-gray-900">建議金額上限：</b>臨時錢包內的資產（包含 Vault 份額）建議不超過 <b className="text-red-600">$100 USD</b> 等值。
              </li>
              <li>
                <b className="text-gray-900">環境安全：</b>請確保電腦無病毒、使用官方瀏覽器、避免公共網路。
              </li>
              <li>
                <b className="text-gray-900">更安全的選擇：</b>熟悉終端機操作的使用者，建議使用{" "}
                <a
                  href="https://github.com/antoncoding/auto-redeem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  CLI 版本
                </a>
              </li>
            </ul>

            {/* 安全確認勾選 */}
            <div className="mt-8 pt-8">
              <label className="flex items-start cursor-pointer hover:bg-yellow-100 p-5 transition-colors">
                <input
                  type="checkbox"
                  checked={hasReadWarnings}
                  onChange={(e) => setHasReadWarnings(e.target.checked)}
                  className="mt-1 mr-4 w-5 h-5 accent-blue-600"
                />
                <span className="text-base text-gray-800 leading-relaxed">
                  我已詳細閱讀並<b>完全理解</b>上述安全風險，且確認我使用的是<b>一次性臨時錢包</b>，
                  內含資產不超過我可承受的損失範圍。
                </span>
              </label>
            </div>
            {!hasReadWarnings && (
              <p className="text-sm mt-6 text-yellow-800 bg-yellow-100 p-5">
                ⚠️ 請先勾選確認已閱讀安全警告
              </p>
            )}
          </div>

          {/* 原操作步驟 - 只有確認後才顯示 */}
          {hasReadWarnings && (
            <div className="bg-white p-8 md:p-12 my-8">
              <h3 className="font-semibold mb-8 text-2xl text-gray-900 pb-4">
                標準操作流程
              </h3>
              <ol className="text-base space-y-5 list-decimal pl-6 leading-loose text-gray-700 my-6">
                <li>
                  <b className="text-gray-900">創建臨時錢包：</b>到{" "}
                  <a href="https://vanity-eth.tk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-medium">
                    vanity-eth.tk
                  </a>{" "}
                  創建全新錢包（不要使用現有錢包）
                </li>
                <li>
                  <b className="text-gray-900">轉移資產：</b>將 Vault 份額轉入臨時錢包，並充值少量 Gas（建議 $5-10 USD）
                </li>
                <li>
                  <b className="text-gray-900">設定參數：</b>填入主錢包地址（收款地址）和臨時錢包私鑰
                </li>
                <li>
                  <b className="text-gray-900">啟動監控：</b>工具會自動偵測流動性並執行贖回+轉帳
                </li>
                <li>
                  <b className="text-gray-900">驗證與清理：</b>確認交易成功後，廢棄臨時錢包
                </li>
              </ol>

              {/* 免責聲明 */}
              <div className="mt-8 pt-8">
                <label className="flex items-start cursor-pointer hover:bg-gray-50 p-5 transition-colors">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 mr-4 w-5 h-5 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    <b>免責聲明：</b>我理解此工具為開源專案，開發者不對任何資產損失負責。
                    我自行承擔使用風險。
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 通行證或阻擋提示 */}
          {hasReadWarnings && agreedToTerms && (
            <div className="bg-green-50 p-8 text-center my-8">
              <p className="text-base text-green-800 font-medium">
                ✅ 安全確認完成，你可以繼續使用工具
              </p>
            </div>
          )}

          {(!hasReadWarnings || !agreedToTerms) && hasReadWarnings && (
            <div className="bg-gray-100 p-8 text-center my-8">
              <p className="text-base text-gray-600">
                請先完成上方的安全確認
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 只有兩個確認都勾選後才顯示下方功能 */}
      {hasReadWarnings && agreedToTerms && (
        <>
          {/* --- 1. 鏈選擇與自訂 RPC 填寫 --- */}
          <div className="bg-white p-8 md:p-12 mb-12 mt-16">
            <h2 className="text-3xl font-semibold mb-8 text-gray-900 pb-6">
              1. 選擇區塊鏈 RPC 網址
            </h2>
            <label className="block text-base font-medium mb-6 text-gray-700">
              選擇常用鏈或輸入自訂 RPC
            </label>
            <div className="flex gap-4 flex-wrap mb-8">
              {DEFAULT_CHAIN_LIST.map((c) => (
                <button
                  key={c.rpc}
                  className="bg-gray-100 px-6 py-3 hover:bg-blue-100 transition-all text-base font-medium"
                  onClick={() => {
                    setRpcUrl(c.rpc);
                    setVaultAddress(c.exampleVault);
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="w-full bg-white px-6 py-4 font-mono text-base focus:bg-gray-50 focus:outline-none transition-all"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="請輸入區塊鏈 RPC 網址"
            />
            
            {/* RPC 安全警告 (強化為紅色阻擋式) */}
            {rpcWarning && (
              <div className="mt-6 p-8 bg-red-50 border-2 border-red-300">
                <div className="flex items-start gap-4 mb-6">
                  <span className="text-red-600 text-3xl font-bold shrink-0">!</span>
                  <div>
                    <h4 className="text-xl font-bold text-red-900 mb-3">自定義 RPC 安全警告</h4>
                    <p className="text-base text-red-800 leading-relaxed">{rpcWarning}</p>
                  </div>
                </div>
                
                {!customRpcConfirmed && (
                  <div className="mt-6 pt-6 border-t border-red-300">
                    <p className="text-sm text-red-800 mb-4">
                      如果你確定此 RPC 來源可信，請在下方輸入 <span className="font-mono bg-red-100 px-2 py-1 font-bold">我了解風險</span> 以繼續使用
                    </p>
                    <input
                      type="text"
                      value={rpcConfirmText}
                      onChange={(e) => {
                        setRpcConfirmText(e.target.value);
                        if (e.target.value === '我了解風險') {
                          setCustomRpcConfirmed(true);
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-red-300 focus:border-red-500 focus:outline-none"
                      placeholder="請輸入：我了解風險"
                    />
                    {rpcConfirmText && rpcConfirmText !== '我了解風險' && (
                      <p className="text-sm text-red-600 mt-2">請正確輸入確認文字</p>
                    )}
                  </div>
                )}
                
                {customRpcConfirmed && (
                  <div className="mt-4 p-4 bg-red-100 text-red-900 font-medium">
                    已確認使用自定義 RPC，請自行承擔風險
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- 2. Vault 地址設定 --- */}
          <div className="bg-white p-8 md:p-12 mb-12 my-10">
            <h2 className="text-3xl font-semibold mb-8 text-gray-900 pb-6">
              2. Vault 合約地址設定
            </h2>
            <input
              type="text"
              className="w-full bg-white px-6 py-4 font-mono text-base focus:bg-gray-50 focus:outline-none mb-6 transition-all"
              value={vaultAddress}
              onChange={(e) => setVaultAddress(e.target.value)}
              placeholder="請輸入 ERC-4626 Vault 的合約地址"
            />
            
            {/* 驗證 Vault 按鈕 */}
            {vaultAddress && vaultAddress.length === 42 && (
              <button
                onClick={handleValidateVault}
                disabled={isValidatingVault}
                className="w-full bg-green-600 text-white py-4 px-6 font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all mb-6"
              >
                {isValidatingVault ? '驗證中...' : '驗證 Vault 合約'}
              </button>
            )}
            
            {/* 驗證結果顯示 */}
            {vaultValidation && (
              <div className={`p-6 mb-6 ${vaultValidation.isValid ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
                {vaultValidation.isValid ? (
                  <div>
                    <h4 className="font-bold text-green-900 mb-3 text-lg">驗證通過 - 這是一個有效的 ERC-4626 Vault</h4>
                    {vaultValidation.assetAddress && (
                      <p className="text-sm text-green-800 font-mono break-all">
                        資產代幣地址: {vaultValidation.assetAddress}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <h4 className="font-bold text-red-900 mb-3 text-lg">驗證失敗</h4>
                    <p className="text-sm text-red-800">{vaultValidation.error}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* 區塊鏈瀏覽器查詢連結（智能顯示對應鏈的瀏覽器）*/}
            {vaultAddress && vaultAddress.startsWith('0x') && vaultAddress.length === 42 && (
              <div className="flex flex-wrap gap-4 text-base mt-6 p-6 bg-gray-50 my-6">
                <span className="text-gray-600 font-medium">在區塊鏈瀏覽器查詢：</span>
                <a
                  href={getExplorerInfo(vaultAddress).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline transition-colors font-medium"
                >
                  {getExplorerInfo(vaultAddress).name}
                </a>
              </div>
            )}
          </div>

          {/* --- 3. 輸入主錢包地址與臨時錢包私鑰 --- */}
          {!tempPrivateKey && customRpcConfirmed && (
            <div className="mb-12 my-10">
              <PrivateKeyInput onSetAccount={handleSetPrivateKey} />
            </div>
          )}
          
          {/* RPC 未確認時的提示 */}
          {!tempPrivateKey && !customRpcConfirmed && rpcWarning && (
            <div className="mb-12 my-10 bg-red-50 p-8 text-center border-2 border-red-300">
              <p className="text-lg text-red-800 font-medium">
                請先確認 RPC 安全警告後才能繼續設定錢包
              </p>
            </div>
          )}
        </>
      )}

      {/* --- 4. 運行狀態顯示與操作 --- */}
       {/* 自動贖回模式已啟動 */}
       {hasReadWarnings && agreedToTerms && !!tempPrivateKey && !!tempAddress && (
        <div className="bg-blue-50 p-8 md:p-12 mb-12 my-10">
          <h2 className="text-3xl font-semibold mb-8 text-gray-900 pb-6">
            自動贖回模式已啟動
          </h2>

          <div className="bg-white p-8 mb-8 space-y-4 text-base my-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <span className="font-medium text-gray-700 min-w-24">主錢包：</span>
              <span className="font-mono text-gray-900 break-all">{mainAddress}</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <span className="font-medium text-gray-700 min-w-24">臨時錢包：</span>
              <span className="font-mono text-gray-900 break-all">{tempAddress}</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <span className="font-medium text-gray-700 min-w-24">RPC 網址：</span>
              <span className="font-mono text-xs text-gray-600 break-all">{rpcUrl}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 my-8">
            {/* 可贖回金額 */}
            <div className="bg-white p-8">
              <div className="text-base text-gray-600 mb-4 font-medium">可贖回金額</div>
              <div className="text-4xl font-bold text-gray-900">
                {formatUnits(redeemableAmount, 18)}
              </div>
            </div>

            {/* 運行狀態 */}
            <div className="bg-white p-8">
              <div className="text-base text-gray-600 mb-4 font-medium">運行狀態</div>
              <div className="text-base">
                {isProcessingTransaction && (
                  <span className="text-xl font-semibold text-orange-600 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-orange-600 rounded-full animate-pulse"></span>
                    交易處理中...
                  </span>
                )}
                {!isProcessingTransaction && isRunning && (
                  <span className="text-xl font-semibold text-green-600 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-green-600 rounded-full animate-pulse"></span>
                    監控中
                  </span>
                )}
                {!isRunning && (
                  <span className="text-gray-400 text-xl font-semibold">已停止</span>
                )}
                {failureCount > 0 && (
                  <div className="text-sm text-red-600 mt-4 font-medium">
                    失敗次數: {failureCount}/{MAX_FAILURES}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 mb-8 my-8">
            {/* 最後交易 */}
            <div className="bg-white p-8">
              <div className="text-base text-gray-600 mb-5 font-medium">最後交易</div>
              {lastRedeemHash || lastTransferHash ? (
                <div className="text-sm space-y-3">
                  {lastRedeemHash && (
                    <a
                      href={getExplorerUrl(lastRedeemHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline block transition-colors"
                    >
                      贖回: {lastRedeemHash.slice(0, 20)}...
                    </a>
                  )}
                  {lastTransferHash && (
                    <a
                      href={getExplorerUrl(lastTransferHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline block transition-colors"
                    >
                      轉帳: {lastTransferHash.slice(0, 20)}...
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">尚無交易</span>
              )}
            </div>
          </div>

          {/* 成功訊息 */}
          {showSuccessMessage && (
            <div className="bg-green-50 border-2 border-green-400 p-10 mb-8 my-8">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-green-600 text-5xl">✓</span>
                <div>
                  <h3 className="text-3xl font-bold text-green-900 mb-2">救援成功！</h3>
                  <p className="text-lg text-green-800">
                    資產已成功贖回並轉移至主錢包
                  </p>
                </div>
              </div>
              <div className="bg-green-100 p-6 mb-6">
                <p className="text-base text-green-900 mb-3 font-medium">請確認以下事項：</p>
                <ul className="list-disc pl-6 space-y-2 text-sm text-green-800">
                  <li>檢查主錢包是否已收到資產</li>
                  <li>在區塊鏈瀏覽器上確認交易狀態</li>
                  <li>確認無誤後，建議立即關閉此頁面</li>
                  <li>廢棄臨時錢包（不要再使用）</li>
                </ul>
              </div>
              <p className="text-sm text-green-700 font-medium">
                私鑰將在 3 秒後自動清除...
              </p>
            </div>
          )}

          {/* 控制按鈕 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 my-8">
            <button
              onClick={handleStartBot}
              disabled={isRunning}
              className="bg-blue-600 text-white py-5 px-8 text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {isRunning ? '運行中' : '啟動自動贖回'}
            </button>
            <button
              onClick={handleStopBot}
              disabled={!isRunning}
              className="bg-red-600 text-white py-5 px-8 text-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              停止
            </button>
            <button
              onClick={handleClearPrivateKey}
              className="bg-gray-600 text-white py-5 px-8 text-lg font-semibold hover:bg-gray-700 transition-all"
            >
              切換錢包
            </button>
          </div>

          {isRunning && (
            <div className="bg-blue-100 p-6 text-base text-blue-900 my-6">
              <span className="font-medium">📡 </span>
              機器人每 2 秒檢查一次流動性，發現可贖回資金時會立即自動簽名贖回並轉帳到主錢包
            </div>
          )}
        </div>
      )}

      {/* 錯誤提示 */}
      {hasReadWarnings && agreedToTerms && error && (
        <div className="bg-red-50 p-8 md:p-12 mb-12 my-10">
          <div className="flex items-start gap-5">
            <span className="text-red-600 text-3xl font-bold shrink-0">⚠</span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-3 text-2xl">錯誤訊息</h3>
              <p className="text-red-800 text-lg leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* --- 教學/安全區塊 --- */}
      {hasReadWarnings && agreedToTerms && (
        <div className="bg-white p-8 md:p-12 mb-12 my-10">
          <h3 className="font-semibold mb-8 text-2xl text-gray-900 pb-4">
            如何查詢 RPC 與 Vault 合約地址
          </h3>
          <ul className="text-base space-y-6 leading-loose text-gray-700">
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">1. 查詢 RPC：</span>
              <span>
                至{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                  href={RPC_GUIDE_LINK}
                >
                  Chainlist.org
                </a>
                {" "}搜尋區塊鏈名稱，複製 RPC 連結
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">2. 查詢 Vault 地址：</span>
              <span>
                至區塊鏈瀏覽器（Etherscan、Snowtrace 等）搜尋協議名稱，
                找到 ERC-4626 合約地址。可使用上方提供的連結直接查詢。
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-gray-900 shrink-0">3. 安全檢查：</span>
              <span>建議透過官方社群或論壇驗證合約地址的正確性</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
