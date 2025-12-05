// src/components/Footer.tsx
export default function Footer() {
  return (
    <footer className="w-full border-t bg-gray-100 mt-10 py-6 px-3 text-xs text-gray-800 text-center">
      <div>
        如果這個小工具對你有幫助，歡迎贊助支持！
        <br />
        <a
          href="https://gcake119.fkey.id/"
          className="underline text-xs"
          style={{ fontSize: "0.75rem" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          Crypto 贊助
        </a>
        ，或
        <a
          href="https://open.firstory.me/join/wwhowbuhow/tier/01925f48-ec8c-449e-74f2-b5ee9380e637"
          className="underline text-xs"
          style={{ fontSize: "0.75rem" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          法幣/信用卡/Line Pay
        </a>
      </div>
      <div className="mt-2">
        本專案開源，repo 請見
        <a
          href="https://github.com/gcake119/auto-redeem-frontend"
          className="underline ml-1 text-xs"
          style={{ fontSize: "0.75rem" }}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        ，有任何問題或建議歡迎 PR、或寄信至
        <a
          href="mailto:wwhowbuhow@pm.me"
          className="underline ml-1 text-xs"
          style={{ fontSize: "0.75rem" }}
        >
          wwhowbuhow@pm.me
        </a>
        聯絡我。
      </div>
    </footer>
  );
}
