# Testnet Setup Guide

Get Polygon Amoy testnet tokens for development and testing.

## Prerequisites

- AI Stilist account with CDP Embedded Wallet
- Get your wallet address from the app dashboard

## Step 1: Get POL (Gas Token)

You need POL to pay for transaction gas fees on Polygon Amoy.

### Alchemy Faucet (Recommended)
- **URL:** https://www.alchemy.com/faucets/polygon-amoy
- **Amount:** 0.5 POL/day with account, 0.2 POL/day without
- **Requirement:** 0.001 ETH on Ethereum Mainnet

### QuickNode Faucet
- **URL:** https://faucet.quicknode.com/polygon/amoy
- **Requirement:** 0.001 ETH on Ethereum Mainnet

### Chainlink Faucet
- **URL:** https://faucets.chain.link/polygon-amoy
- **Features:** Multiple testnet assets available

### Polygon Faucet Directory
- **URL:** https://faucet.polygon.technology
- **Features:** Lists all available faucet options

## Step 2: Get USDC (Testnet)

### Circle Public Faucet (Easiest)
- **URL:** https://faucet.circle.com
- **Amount:** 10 USDC per request
- **Rate limit:** 1 request per 24 hours
- **Account:** No account required ✅

**Instructions:**
1. Visit https://faucet.circle.com
2. Select "Polygon Amoy" network
3. Paste your wallet address
4. Click "Get USDC"
5. Wait 1-2 minutes for tokens to arrive

### Circle Developer Console (Higher Limits)
- **URL:** https://console.circle.com/faucet
- **Amount:** 20 USDC per request
- **Rate limit:** 10 requests per 24 hours
- **Account:** Requires free Circle developer account

## Step 3: Verify Tokens

Check your wallet balance:

### Option A: In AI Stilist App
1. Go to Dashboard
2. View "Wallet Balance" card
3. Should show USDC balance
4. Click "Refresh" to update

### Option B: Block Explorer
1. Visit https://amoy.polygonscan.com
2. Paste your wallet address in search
3. View POL and USDC token balances

## Contract Addresses

### Polygon Amoy Testnet (Chain ID: 80002)
- **USDC:** `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
- **Native Token:** POL
- **Explorer:** https://amoy.polygonscan.com

### Polygon Mainnet (Chain ID: 137)
- **USDC:** `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`
- **Native Token:** POL
- **Explorer:** https://polygonscan.com

## Troubleshooting

### Balance Not Showing
- Wait 1-2 minutes for blockchain confirmation
- Click "Refresh" button in wallet card
- Check block explorer to verify transaction

### Faucet Not Working
- Some faucets require 0.001 ETH on Ethereum mainnet
- Try alternative faucets listed above
- Check faucet rate limits (24 hour cooldown)

### Wrong Network
- Verify you're on Polygon Amoy (not Polygon mainnet)
- Check app shows "Polygon Amoy Testnet" at bottom of wallet card
- Environment variable `NEXT_PUBLIC_APP_ENV` should be "dev"

## Important Notes

- **Testnet USDC has no real value** - only for testing
- **Always verify network** before sending real funds
- **POL is required** for all transactions (gas fees)
- **Keep some POL** in your wallet at all times

## Need Help?

- Check transaction status: https://amoy.polygonscan.com
- Polygon docs: https://docs.polygon.technology
- Circle USDC docs: https://developers.circle.com/stablecoins
