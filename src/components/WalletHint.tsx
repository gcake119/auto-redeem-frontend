import { useState } from 'react';

export default function WalletHint() {
  const [hasReadWarnings, setHasReadWarnings] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <div className="space-y-6">
      {/* 警告區塊 */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg shadow-sm p-6 md:p-8">
        <h3 className="font-bold mb-6 text-xl text-gray-900 flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          重要安全警告 - 使用前必讀
        </h3>
        <ul className="list-disc pl-6 space-y-4 text-sm leading-relaxed text-gray-800">
          <li>
            <b className="text-gray-900">私鑰風險：</b>此工具會在瀏覽器前端處理臨時錢包私鑰。
            若環境被惡意軟體或駭客攻擊，私鑰可能被竊取。
          </li>
          <li>
            <b className="text-gray-900">僅限臨時錢包：</b>請<span className="font-bold underline text-red-600">絕對不要</span>使用主錢包或存有大量資產的錢包私鑰。
            只能使用專為此次救援創建的一次性臨時錢包。
          </li>
          <li>
            <b className="text-gray-900">建議金額上限：</b>臨時錢包內的資產（包含 Vault 份額）建議不超過 <b className="text-red-600">$1,000 USD</b> 等值。
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
        <div className="mt-6 pt-6 border-t border-yellow-300">
          <label className="flex items-start cursor-pointer hover:bg-yellow-100 p-3 rounded-lg transition-colors">
            <input
              type="checkbox"
              checked={hasReadWarnings}
              onChange={(e) => setHasReadWarnings(e.target.checked)}
              className="mt-1 mr-3 w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-800">
              我已詳細閱讀並<b>完全理解</b>上述安全風險，且確認我使用的是<b>一次性臨時錢包</b>，
              內含資產不超過我可承受的損失範圍。
            </span>
          </label>
        </div>
        {!hasReadWarnings && (
          <p className="text-xs mt-4 text-yellow-700 bg-yellow-100 p-3 rounded-lg">
            ⚠️ 請先勾選確認已閱讀安全警告
          </p>
        )}
      </div>

      {/* 原操作步驟 - 只有確認後才顯示 */}
      {hasReadWarnings && (
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <h3 className="font-semibold mb-6 text-lg text-gray-900 border-b border-gray-200 pb-3">
            標準操作流程
          </h3>
          <ol className="text-sm space-y-4 list-decimal pl-5 leading-relaxed text-gray-700">
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
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="flex items-start cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 accent-blue-600"
              />
              <span className="text-xs text-gray-700">
                <b>免責聲明：</b>我理解此工具為開源專案，開發者不對任何資產損失負責。
                我自行承擔使用風險。
              </span>
            </label>
          </div>
        </div>
      )}

      {/* 通行證或阻擋提示 */}
      {hasReadWarnings && agreedToTerms && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-5 text-center">
          <p className="text-sm text-green-800 font-medium">
            ✅ 安全確認完成，你可以繼續使用工具
          </p>
        </div>
      )}

      {(!hasReadWarnings || !agreedToTerms) && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-5 text-center">
          <p className="text-sm text-gray-600">
            請先完成上方的安全確認
          </p>
        </div>
      )}
    </div>
  );
}
