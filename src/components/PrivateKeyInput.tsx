import React, { useState } from 'react';
import { deriveTempAddressFromPrivateKey } from '../hooks/PrivateKeyAutoSigner';

type PrivateKeyInputProps = {
  onSetAccount: (mainAddress: string, tempPrivateKey: string, tempAddress: string) => void;
};

export default function PrivateKeyInput({ onSetAccount }: PrivateKeyInputProps) {
  const [mainAddress, setMainAddress] = useState('');
  const [tempPrivateKey, setTempPrivateKey] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const addr = mainAddress.trim();
    let pk = tempPrivateKey.trim();

    // -------- 驗證主錢包地址格式 --------
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setError('主錢包地址格式錯誤（必須是 0x 開頭 42 字元）');
      return;
    }

    // -------- 驗證臨時私鑰格式 --------
    if (pk.length === 64) pk = '0x' + pk;
    if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
      setError('臨時錢包私鑰格式錯誤（必須為 64/66 字元十六進位）');
      return;
    }

    // -------- 從私鑰生成臨時錢包地址（自動推導） --------
    try {
      const tempAddr = deriveTempAddressFromPrivateKey(pk as `0x${string}`);
      setError('');
      // 回傳主錢包地址、臨時私鑰、臨時錢包地址
      onSetAccount(addr, pk, tempAddr);
    } catch (e) {
      setError('❌ 私鑰無法生成有效的錢包地址，請檢查私鑰');
    }
  };

  return (
    <div className="bg-yellow-100 p-4 rounded mb-6 space-y-3">
      <div>
        <label className="block text-sm font-bold mb-1">主錢包地址</label>
        <input
          type="text"
          value={mainAddress}
          onChange={e => setMainAddress(e.target.value.trim())}
          className="w-full border px-3 py-2 rounded font-mono text-sm"
          placeholder="0x主錢包地址"
        />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">臨時錢包私鑰（用於自動搶提領）</label>
        <input
          type="password"
          value={tempPrivateKey}
          onChange={e => setTempPrivateKey(e.target.value.trim())}
          className="w-full border px-3 py-2 rounded font-mono text-sm"
          placeholder="臨時錢包私鑰（64/66字元）"
        />
      </div>
      <button
        onClick={handleConfirm}
        className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
      >
        確認並啟動自動救援
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
