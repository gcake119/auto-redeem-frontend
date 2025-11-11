import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Auto Redeem 救援工具',
  description: '自動偵測並贖回受困於低流動性 Vault 的資金',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className="bg-white min-h-screen">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1 w-full flex justify-center">{children}</main>
          </div>
        </Providers>
        <Footer />
      </body>
    </html>
  );
}