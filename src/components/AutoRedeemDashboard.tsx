"use client";

import { useState, useRef, useEffect } from "react";
import WalletHint from "./WalletHint";
import PrivateKeyInput from "./PrivateKeyInput";
import { formatUnits } from "viem";
import {
  autoRedeemAndTransfer,
  queryMaxRedeem
} from "../hooks/PrivateKeyAutoSigner";

/* ========== 1. 起始環境初值與狀態 ========== */
const RPC_GUIDE_LINK = "https://chainlist.org/";
const VAULT_GUIDE_LINK = "https://snowtrace.io/";

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

  // 監控贖回狀態
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [redeemableAmount, setRedeemableAmount] = useState<bigint>(0n);
  const [lastRedeemHash, setLastRedeemHash] = useState<string | undefined>(undefined);
  const [lastTransferHash, setLastTransferHash] = useState<string | undefined>(undefined);

  const intervalRef = useRef<number | null>(null);

  /* ========== 2. 處理私鑰輸入與驗證 ========== */
  // PrivateKeyInput 回傳主錢包地址 + 臨時私鑰
  // 從臨時私鑰推導出臨時錢包地址
  const handleSetPrivateKey = (mainAddr: string, pk: string, tempAddr: string) => {
    // -------- 直接設定所有值，不需額外驗證 --------
    setMainAddress(mainAddr);
    setTempPrivateKey(pk);
    setTempAddress(tempAddr);
    setError('');
  };

  /* ========== 3. 自動輪詢贖回核心邏輯 ========== */
  useEffect(() => {
    if (!isRunning || !tempPrivateKey || !tempAddress || !vaultAddress || !rpcUrl)
      return;

    setError('');

    // 清除舊的 interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 每秒輪詢：查詢最大可贖回金額，若 > 0n 則自動贖回並轉帳
    intervalRef.current = window.setInterval(async () => {
      try {
        // 步驟 1：查詢臨時錢包在 vault 的最大可贖回金額
        const maxRedeem = await queryMaxRedeem(
          vaultAddress as `0x${string}`,
          tempAddress as `0x${string}`,
          rpcUrl
        );
        setRedeemableAmount(maxRedeem);

        // 步驟 2：若有可贖回金額，自動執行贖回 + 轉帳
        if (maxRedeem > 0n) {
          console.log('🚀 偵測到可贖回金額，開始自動贖回 + 轉帳...');
          
          // 呼叫完整的贖回 + 轉帳函數
          // 需要完整傳入所有參數
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
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        setError(`⚠️ 輪詢/贖回失敗: ${errorMsg}`);
        console.error('Error:', e);
      }
    }, 1000);

    // Cleanup：停止時清除 interval
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tempPrivateKey, tempAddress, vaultAddress, rpcUrl, mainAddress]);

  /* ========== 4. 停止自動贖回 ========== */
  const handleStopBot = () => {
    setIsRunning(false);
    setRedeemableAmount(0n);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /* ========== 5. 切換錢包 ========== */
  const handleClearPrivateKey = () => {
    setTempPrivateKey('');
    setTempAddress('');
    setMainAddress('');
    setIsRunning(false);
    setRedeemableAmount(0n);
    setLastRedeemHash(undefined);
    setLastTransferHash(undefined);
    handleStopBot();
  };

  /* ========== UI 表單與流程 ========== */
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* --- 頁面標題 & 說明 --- */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">自動贖回救援工具</h1>
        <p className="text-gray-600">
          使用臨時錢包自動偵測 ERC-4626 Vault 流動性資金
          <br />
        </p>
      </div>
      <WalletHint />

      {/* --- 1. 鏈選擇與自訂 RPC 填寫 --- */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          1️⃣ 選擇/輸入鏈的 RPC 網址
        </h2>
        <label className="block text-sm font-medium mb-2">
          選擇常用鏈 or 輸入自訂 RPC
        </label>
        <div className="flex gap-2 flex-wrap mb-2">
          {DEFAULT_CHAIN_LIST.map((c) => (
            <button
              key={c.rpc}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
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
          className="w-full border px-4 py-2 rounded font-mono"
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
          placeholder="請輸入區塊鏈 RPC 網址"
        />
      </div>

      {/* --- 2. Vault 地址設定 --- */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">2️⃣ Vault 合約地址設定</h2>
        <input
          type="text"
          className="w-full border px-4 py-2 rounded font-mono"
          value={vaultAddress}
          onChange={(e) => setVaultAddress(e.target.value)}
          placeholder="請輸入 ERC-4626 Vault 的合約地址"
        />
      </div>

      {/* --- 3. 輸入主錢包地址與臨時錢包私鑰 --- */}
      {!tempPrivateKey && (
        <PrivateKeyInput onSetAccount={handleSetPrivateKey} />
      )}

      {/* --- 4. 運行狀態顯示與操作 --- */}
       {/* 自動贖回模式已啟動 */}
       {!!tempPrivateKey && !!tempAddress && (
        <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-600 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-green-900">
            🤖 自動贖回模式已啟動
          </h2>

          <div className="font-sm mb-2">
            <span className="inline-block mr-2"><b>主錢包</b>：</span>
            <span className="font-mono">{mainAddress}</span>
          </div>
          <div className="font-sm mb-2">
            <span className="inline-block mr-2"><b>臨時錢包</b>：</span>
            <span className="font-mono">{tempAddress}</span>
          </div>
          <div className="font-sm mb-4">
            <span className="inline-block mr-2"><b>RPC 網址</b>：</span>
            <span className="font-mono text-xs">{rpcUrl}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* 可贖回金額 */}
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">可贖回金額</div>
              <div className="text-lg font-bold text-green-600">
                {formatUnits(redeemableAmount, 18)}
              </div>
            </div>

            {/* 最後交易 */}
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">最後交易</div>
              {lastRedeemHash || lastTransferHash ? (
                <div className="text-xs space-y-1">
                  {lastRedeemHash && (
                    <a
                      href={`https://snowtrace.io/tx/${lastRedeemHash}`}
                      target="_blank"
                      className="text-blue-600 underline block"
                    >
                      贖回: {lastRedeemHash.slice(0, 12)}...
                    </a>
                  )}
                  {lastTransferHash && (
                    <a
                      href={`https://snowtrace.io/tx/${lastTransferHash}`}
                      target="_blank"
                      className="text-blue-600 underline block"
                    >
                      轉帳: {lastTransferHash.slice(0, 12)}...
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">尚無</span>
              )}
            </div>
          </div>

          {/* 控制按鈕 */}
          <div className="flex gap-4">
            <button
              onClick={() => setIsRunning(true)}
              disabled={isRunning}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300"
            >
              {isRunning ? '運行中...' : '啟動自動贖回'}
            </button>
            <button
              onClick={handleStopBot}
              disabled={!isRunning}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300"
            >
              停止
            </button>
            <button
              onClick={handleClearPrivateKey}
              className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-700"
            >
              切換錢包
            </button>
          </div>

          {isRunning && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ 機器人每秒檢查一次流動性，發現可贖回資金時會立即自動簽名贖回並轉帳到主錢包。
              </p>
            </div>
          )}
        </div>
      )}

      {/* 錯誤提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 mb-3">
          {error}
        </div>
      )}

      {/* --- 教學/安全區塊 --- */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          🔎 【教學】如何查詢 RPC 與 Vault 合約地址？
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 mb-3">
          <li>
            <b>1. 查詢 RPC：</b>至{" "}
            <a
              target="_blank"
              className="underline text-blue-700"
              href={RPC_GUIDE_LINK}
            >
              Chainlist.org
            </a>
            ，搜尋「Avalanche, Arbitrum, Ethereum」等主網/測試網名稱，複製 RPC
            連結貼入上方
          </li>
          <li>
            <b>2. 查詢 Vault 地址：</b>至{" "}
            <a
              target="_blank"
              className="underline text-blue-700"
              href={VAULT_GUIDE_LINK}
            >
              Snowtrace\Etherscan
            </a>{" "}
            搜尋協議名稱（如 Euler Finance），點選資金池，複製 ERC-4626 合約地址
          </li>
          <li>
            <b>3. 檢查：</b>建議善用社群 Discord/TG 或官方論壇雙重查驗再操作
          </li>
        </ul>
        <div className="text-xs text-blue-600">
          <b>安全小提醒</b>：小額臨時錢包/資金限定，自行驗證 RPC 來源與 Vault
          合約官方性！
        </div>
      </div>
    </div>
  );
}

