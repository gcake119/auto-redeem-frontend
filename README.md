# Auto Redeem Rescue Web Dashboard

**Live Demo:** [https://auto-redeem.zeabur.app](https://auto-redeem.zeabur.app/)

A streamlined rescue dashboard for ERC-4626 vaults. **Use only with temporary wallets and small funds!**

## About This Project

This project is a frontend adaptation inspired by Anton Cheng's excellent [auto-redeem rescue script (Node.js CLI)](https://github.com/antoncoding/auto-redeem).  
It brings the same single-purpose rescue workflow to a purely browser-based, UI-driven interface, eliminating the need for shell access.

### Reference Implementation

- **Node script:** [https://github.com/antoncoding/auto-redeem](https://github.com/antoncoding/auto-redeem)
- **Original author:** [Anton Cheng (@antoncoding)](https://github.com/antoncoding)
- **Security warning:** Node version is recommended for advanced users, higher security, full operator control.

## Security Warning

⚠️ **Critical:**  
This web dashboard exposes the rescue wallet private key in browser memory and application context.  
If you are comfortable with command-line node scripts (or need to rescue significant assets), use Anton Cheng's original [auto-redeem CLI](https://github.com/antoncoding/auto-redeem) for maximum safety.

## How It Works

1. Generate a one-time wallet (use [vanity-eth.tk](https://vanity-eth.tk)), do NOT use your main wallet.
2. Transfer ERC-4626 vault shares and a small amount of native gas to that wallet.
3. Enter your main wallet address, the rescue private key, and vault/RPC info into the dashboard UI.
4. Start rescue: the bot auto-redeems shares and sends all rescued assets to your main wallet.
5. All status and network actions are shown in the UI and chain explorers.

## Getting Started

### Local Development / Build

Clone repository, run:

```bash
git clone https://github.com/gcake119/auto-redeem-frontend.git
cd auto-redeem-frontend
npm install
npm run dev
npm run build
npm run start
```

## References

- [antoncoding/auto-redeem](https://github.com/antoncoding/auto-redeem)—Original CLI implementation
- [ERC-4626 Vault Standard](https://erc4626.info/)

---

MIT License.
