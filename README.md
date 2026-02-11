# RedCircle

> **Transform viral Reddit posts into tradable blockchain assets**

---

## What is RedCircle?

RedCircle is a decentralized platform that converts Reddit posts into **SPL tokens** on the Solana blockchain. Users can tokenize viral content, buy/sell tokens, and speculate on cultural impact.

**Think of it as:** A stock market for memes and viral content.

### The Problem
- Content creators can't monetize viral posts
- Social media engagement has no tangible value
- No way to invest in content you believe will trend

### Our Solution
- **Tokenize** any Reddit post as an SPL token on Solana
- **Trade** tokens based on predicted virality
- **Earn** from early investments in trending content
- All transactions verified on blockchain

---

## How It Works

### Create a Token

```
1. Find a Reddit post you think will go viral
2. Enter the post URL on RedCircle
3. Set token supply and initial price
4. Platform mints SPL token on Solana blockchain
5. Token is now tradable
```

**On-Chain:**
- Creates unique token mint address on Solana
- Mints specified supply to platform wallet
- Token becomes tradable immediately

---

**How Trading Works:**

**Buying:**
- User pays SOL → receives tokens
- Price increases as more people buy
- Early buyers get lowest prices

**Selling:**
- User sends tokens → receives SOL (minus 5% fee)
- Price decreases as tokens are sold back
- Platform provides instant liquidity

**Example:**
```
Token: POST123 (1M supply, 0.001 SOL initial price)

Day 1: Sam buys 10,000 tokens @ 0.001 = 10 SOL
Day 2: Post goes viral, 500K tokens sold
       Price now: 0.00225 SOL
Day 3: Sam sells @ 0.00225 = 21.4 SOL
       Profit: 114% in 2 days
```

---

## Use Cases

**For Content Creators:**
- Monetize viral posts directly
- Earn from token trading activity

**For Traders:**
- Speculate on post virality
- Early investment opportunities
- Profit from cultural moments

**For Communities:**
- Collectively own memorable content
- Support favorite creators financially

---

## Getting Started

1. Visit [redcircle.lol](https://www.redcircle.lol)
2. Connect your Solana wallet (Phantom, Solflare, etc.)
3. Sign in with Reddit
4. Start trading or create your first token

---

## Development Setup

### Prerequisites
- Node.js 24+ 
- pnpm 10+
- Supabase account

### Installation

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev:web      # Frontend on port 3001
pnpm dev:server   # Backend on port 3000

# Database management
pnpm db:studio    # Open Drizzle Studio
pnpm db:push      # Push schema changes to Supabase
```

### Environment Variables

**Backend** (`apps/server/.env`):
```env
DATABASE_URL=postgresql://postgres.euqumaxjojmyhkwevqur:redcircle9089@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
JWT_SECRET=your_jwt_secret
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_REDIRECT_URI=https://api.redcircle.lol/auth/reddit/callback
FRONTEND_URL=https://www.redcircle.lol
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_AUTHORITY_PRIVATE_KEY=your_private_key
```

**Frontend** (`apps/web/.env`):
```env
VITE_API_URL=https://redcircle-web.onrender.com
```

### Project Structure

```
redcircle/
├── apps/
│   ├── web/              # Vite + React frontend
│   └── server/           # Express API backend + Database
│       └── src/
│           └── db/       # Drizzle ORM schemas & migrations
└── package.json          # Workspace root
```

**✨ Simplified Structure:**
- No more `packages/` folder - all database code is now in the server
- Cleaner, easier to understand and deploy
- See [SIMPLIFIED_STRUCTURE.md](./SIMPLIFIED_STRUCTURE.md) for details

---

## Tech Stack

- **Frontend**: React 19, Vite, TanStack Router, Tailwind CSS
- **Backend**: Express, Node.js
- **Database**: Supabase PostgreSQL (via Drizzle ORM)
- **Blockchain**: Solana, SPL Tokens, Meteora DBC
- **Auth**: Reddit OAuth + JWT
- **Deployment**: Vercel (frontend) + Render (backend)

---

## Recent Updates

### 🎯 Simplified Project Structure (Feb 2026)
- **Removed** `packages/` folder completely
- **Moved** all database code directly into `apps/server/src/db/`
- **Cleaner** structure - no more monorepo complexity
- **Easier** to understand, maintain, and deploy
- See [SIMPLIFIED_STRUCTURE.md](SIMPLIFIED_STRUCTURE.md) for details

### 🎉 Supabase Migration (Feb 2026)
- Migrated from Neon to Supabase PostgreSQL
- Zero breaking changes - all features working
- Better database management and monitoring
- See [MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md) for details

### ✨ Waitlist Feature
- Cool animated email input component
- Email validation and duplicate checking
- Toast notifications
- Located at: `apps/web/src/components/WaitlistInput.tsx`

---

<div align="center">

**Built on Solana Blockchain**

</div>
