import React, { useState } from 'react';
import { deriveTempAddressFromPrivateKey } from '../hooks/PrivateKeyAutoSigner';
import { isValidAddress, normalizePrivateKey, isValidPrivateKey } from '../utils/validation';

type PrivateKeyInputProps = {
  onSetAccount: (mainAddress: string, tempPrivateKey: string, tempAddress: string) => void;
};

export default function PrivateKeyInput({ onSetAccount }: PrivateKeyInputProps) {
  const [mainAddress, setMainAddress] = useState('');
  const [tempPrivateKey, setTempPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleConfirm = async () => {
    setError('');
    setIsValidating(true);

    try {
      const addr = mainAddress.trim();

      // -------- 驗證主錢包地址格式 --------
      if (!isValidAddress(addr)) {
        setError('❌ 主錢包地址格式錯誤（必須是 0x 開頭 42 字元）');
        setIsValidating(false);
        return;
      }

      // -------- 驗證臨時私鑰格式 --------
      if (!isValidPrivateKey(tempPrivateKey)) {
        setError('❌ 臨時錢包私鑰格式錯誤（必須為 64/66 字元十六進位）');
        setIsValidating(false);
        return;
      }

      // 標準化私鑰
      const pk = normalizePrivateKey(tempPrivateKey);

      // -------- 從私鑰生成臨時錢包地址（自動推導） --------
      try {
        const tempAddr = deriveTempAddressFromPrivateKey(pk);
        
        // -------- 最終安全確認（新增加強版警示） --------
        const finalWarning = 
          `⚠️最後安全確認⚠️\n\n` +
          `在啟動自動救援工具之前，請確認以下重要事項：\n\n` +
          `✓ 您使用的私鑰是【一次性臨時錢包】的私鑰\n` +
          `✓ 這個臨時錢包是【全新創建】且【從未在其他地方使用】\n` +
          `✓ 您【絕對沒有】輸入主錢包或任何重要錢包的私鑰\n` +
          `✓ 您完全理解使用此工具的風險\n\n` +
          `確認以上所有事項無誤後，點擊「確定」繼續。`;

        if (window.confirm(finalWarning)) {
            setError('');
            // 回傳主錢包地址、臨時私鑰、臨時錢包地址
            onSetAccount(addr, pk, tempAddr);
        }
      } catch (e) {
        setError('私鑰無法生成有效的錢包地址，請檢查私鑰是否正確');
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="bg-white p-8 md:p-12">
      <h3 className="text-3xl font-semibold mb-8 text-gray-900 pb-6">
        3. 設定錢包資訊（臨時錢包專用）
      </h3>
      
      <div className="space-y-8">
        <div>
          <label className="block text-base font-medium mb-4 text-gray-700">
            主錢包地址（最終收款地址）
          </label>
          <input
            type="text"
            value={mainAddress}
            onChange={e => setMainAddress(e.target.value.trim())}
            className="w-full bg-white px-6 py-4 font-mono text-base focus:bg-gray-50 focus:outline-none transition-all"
            placeholder="0x 主錢包地址（接收贖回資金）"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
          />
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            這是你的安全錢包地址，所有贖回的資產將自動轉入此地址
          </p>
        </div>
        
        <div>
          <label className="block text-base font-medium mb-4 text-gray-700">
            臨時錢包私鑰
            <span className="text-gray-500 ml-2 font-normal">（僅用於此次救援的一次性錢包）</span>
          </label>
          <input
            type="password"
            value={tempPrivateKey}
            onChange={e => setTempPrivateKey(e.target.value.trim())}
            className="w-full bg-white px-6 py-4 font-mono text-base focus:bg-gray-50 focus:outline-none transition-all"
            placeholder="臨時錢包私鑰（64/66字元）"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            data-lpignore="true"
          />
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            絕對不要使用主錢包私鑰！只能使用專門為此次救援創建的臨時錢包
          </p>
        </div>
      </div>
      
      <button
        onClick={handleConfirm}
        disabled={isValidating}
        className="w-full bg-blue-600 text-white py-5 mt-10 font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
      >
        {isValidating ? '驗證中...' : '確認並啟動自動救援'}
      </button>
      
      {error && (
        <div className="mt-8 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <span className="text-red-600 font-bold text-xl shrink-0">⚠</span>
            <p className="text-base text-red-800">{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 p-6 mt-8 text-sm text-gray-700 leading-loose">
        <p className="font-semibold mb-4 text-gray-900 text-base">安全提示：</p>
        <ul className="list-disc pl-6 space-y-3">
          <li>臨時錢包應該是全新創建的，從未在其他地方使用過</li>
          <li>確保臨時錢包內已有 Vault 份額和少量 Gas 代幣</li>
          <li>建議臨時錢包總資產價值不超過 $100 USD</li>
          <li>救援完成後，請立即廢棄此臨時錢包</li>
        </ul>
      </div>
    </div>
  );
}
