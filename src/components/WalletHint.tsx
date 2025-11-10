export default function WalletHint() {
  return (
    <div>
      {/* 紅色警告區塊：危險、專業用戶必看 */}
      <div className="bg-red-100 border-l-4 border-red-500 text-red-900 p-4 mb-4 rounded">
        <h3 className="font-bold mb-1">🚨 重要安全警告</h3>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>此網頁工具會在瀏覽器前端直接處理你的臨時錢包私鑰，
          若瀏覽器、作業系統或環境被惡意軟體、外掛或駭客攻擊，
          你的私鑰恐有暴露、被竊取或盜用的風險！</li>
          <li>建議只用於「臨時/小額救援錢包」，<b>請勿使用主錢包私鑰</b>。</li>
          <li>熟悉終端機輸入指令操作與重視資安的使用者，請優先採用 @Anton 的指令版工具：<br />
            <a href="https://github.com/antoncoding/auto-redeem" target="_blank" className="underline text-blue-800">
              https://github.com/antoncoding/auto-redeem
            </a>
          </li>
        </ul>
      </div>

      {/* 原操作步驟黃底區塊 */}
      <div className="bg-yellow-50 p-4 rounded-lg mb-4">
        <h3 className="font-semibold mb-2">🔐 操作步驟：建議使用臨時錢包私鑰進行</h3>
          <ol className="text-sm space-y-2 list-decimal pl-5">
            <li>到 <a href="https://vanity-eth.tk" target="_blank" className="underline">vanity-eth.tk</a> 產生新錢包</li>
            <li>把想贖回的資金池份額（Share Token）轉進新的臨時錢包</li>
            <li>充值少量主鏈代幣作為 gas</li>
            <li>啟動自動救援，因為自動贖回到臨時錢包後，系統會自動再發送所有贖回資金到原主錢包</li>
            <li>可透過鏈上瀏覽器查詢贖回與轉帳紀錄</li>
            <li>支援自訂鏈 RPC 與自訂 Vault 地址</li>
          </ol>
      </div>
    </div>
  );
}
