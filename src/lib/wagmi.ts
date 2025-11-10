import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalanche } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Auto Redeem Rescue',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // 從 cloud.walletconnect.com 取得
  chains: [avalanche],
  ssr: true,
});
