# X402 Marketplace Server

A standalone marketplace server implementing the X402 protocol with AP2 (Agent Payments Protocol) intent verification and on-chain payment verification.

## Features

- **X402 Payment Protocol** - HTTP 402 Payment Required with blockchain verification
- **On-Chain Payment Verification** - Real payment verification via Polygon network
- **AP2 Intent Verification** - EIP-712 signature verification for spending authorizations
- **Agent-Based Purchasing** - Autonomous agent purchases on behalf of users
- **Spending Constraints** - Category, brand, and price limit enforcement
- **Database-Backed** - PostgreSQL for persistent purchase history and deduplication
- **Transaction Deduplication** - Prevents replay attacks via database tracking

## Architecture

This is a **standalone service** representing an external marketplace. It:
- Has its own PostgreSQL database (separate from main app)
- Uses workspace packages (`@ai-stilist/x402`, `@ai-stilist/logger`)
- Verifies payments independently on Polygon blockchain
- Does NOT share database with the main Closet application

## Setup

### 1. Install Dependencies
```bash
bun install
```

### 2. Start Database
```bash
bun run db:start
```

This starts PostgreSQL on port `54322` (separate from main app's `54321`).

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required variables:
- `DATABASE_URL` - Marketplace's own PostgreSQL database
- `POLYGON_RPC_URL` - Polygon RPC for payment verification
- `FACILITATOR_URL` - X402 facilitator service URL
- `MERCHANT_WALLET_ADDRESS` - Merchant's wallet address

### 4. Push Database Schema
```bash
bun run db:push
```

### 5. Start Server
```bash
bun run dev
```

Server runs on port `3003` by default.

## API Endpoints

### GET /
Health check - returns marketplace info and item count.

### GET /api/items
List all available items with optional filters.

**Query parameters:**
- `category` - Filter by category (e.g., "outerwear", "footwear")
- `minPrice` - Minimum price filter (USD)
- `maxPrice` - Maximum price filter (USD)

**Response:**
```json
{
  "items": [...],
  "total": 10
}
```

### GET /api/items/:id
Get a single item (X402 protocol).

**Without X-PAYMENT header:**
Returns `402 Payment Required` with payment requirements:
```json
{
  "x402Version": "1.0",
  "accepts": [{
    "amount": "299.99",
    "currency": "USDC",
    "network": "polygon-amoy",
    "recipient": "0x742d35..."
  }],
  "paymentMethods": ["crypto"],
  "item": { "id": "...", "name": "...", ... }
}
```

**With X-PAYMENT header:**
Returns `200 OK` with item after verifying:
1. ✅ AP2 intent signature (EIP-712)
2. ✅ Purchase constraints (category, brand, price)
3. ✅ Transaction deduplication (database check)
4. ✅ **On-chain payment verification** (Polygon blockchain via X402 client)
5. ✅ Purchase storage in database

Returns `402`, `403`, or `409` on verification failure.

### GET /api/purchases
Get all purchase history (for debugging).

**Response:**
```json
{
  "purchases": [...],
  "total": 5
}
```

## X-PAYMENT Header Format

```json
{
  "ap2Intent": {
    "userId": "0x123...",
    "agentId": "0xabc...",
    "monthlyBudget": 50000,
    "maxPerTransaction": 10000,
    "allowedCategories": ["outerwear", "footwear"],
    "allowedBrands": ["Heritage & Co"],
    "validFrom": "2024-01-01T00:00:00Z",
    "validUntil": "2024-12-31T23:59:59Z"
  },
  "ap2Signature": "0x...",
  "txHash": "0x...",
  "network": "polygon-amoy"
}
```

## Database Schema

### purchases
- `id` - Unique purchase ID
- `item_id` - Item purchased
- `tx_hash` - Unique transaction hash (prevents replay)
- `user_wallet_address` - User's wallet
- `agent_wallet_address` - Agent's wallet
- `amount` - Amount in cents
- `network` - Blockchain network
- `payment_proof` - Full X402 verification proof
- `ap2_intent` - Stored AP2 intent
- `item_snapshot` - Snapshot of item at purchase time
- `created_at` - Purchase timestamp

## Payment Verification Flow

1. **Client requests item** → Receives 402 with payment requirements
2. **Agent executes payment** → Gets transaction hash
3. **Client retries with X-PAYMENT header** containing:
   - AP2 intent (signed spending authorization)
   - Transaction hash
4. **Marketplace verifies**:
   - ✅ AP2 signature valid (user signed the intent)
   - ✅ Purchase within constraints (category, brand, price)
   - ✅ Transaction hash not used before (database check)
   - ✅ **Payment confirmed on-chain** (X402 client queries Polygon)
5. **Marketplace stores purchase** → Database record with full proof
6. **Returns 200** with X-PAYMENT-RESPONSE header

## Development Scripts

- `bun run dev` - Start development server with watch mode
- `bun run start` - Start production server
- `bun run db:start` - Start PostgreSQL in Docker
- `bun run db:stop` - Stop PostgreSQL
- `bun run db:push` - Push schema changes to database
- `bun run db:generate` - Generate migration files
- `bun run db:studio` - Open Drizzle Studio UI

## Environment Variables

See `.env.example` for all configuration options.

Key settings:
- `APP_ENV` - "dev" or "prod" (affects network selection)
- `PORT` - Server port (default: 3003)
- `DATABASE_URL` - PostgreSQL connection string
- `POLYGON_RPC_URL` - RPC endpoint for payment verification
- `FACILITATOR_URL` - X402 facilitator service
- `MERCHANT_WALLET_ADDRESS` - Where payments are sent

## Dependencies

**Workspace packages:**
- `@ai-stilist/logger` - Structured logging with Pino

**External packages:**
- `drizzle-orm` + `postgres` - Database ORM and client
- `viem` - Ethereum/Polygon blockchain interaction
- `hono` - Web framework
- `zod` - Runtime type validation

## AI Agent Integration

From the Closet app, agents can search and purchase items:

```typescript
// Search marketplace
searchExternalMarketplace({
  category: "outerwear",
  maxPrice: 300
})

// Purchase item with spending authorization
purchaseFromMarketplace({
  itemId: "item-001",
  authorizationId: "spending_auth_..."
})
```

The purchase tool will:
1. Fetch spending authorization from main app DB
2. GET item (receive 402)
3. Validate against authorization constraints
4. Execute real payment via X402 facilitator
5. Retry GET with X-PAYMENT header containing proof
6. Record spending in authorization

## Protocol Compliance

This implementation follows:
- **X402 v1.0** - HTTP 402 Payment Required standard
- **AP2** - Agent Payments Protocol for delegated spending
- **EIP-712** - Typed structured data hashing and signing
- **EIP-3009** - Gasless USDC transfers via facilitator
- **Polygon Network** - USDC payments on Polygon (mainnet/testnet)
