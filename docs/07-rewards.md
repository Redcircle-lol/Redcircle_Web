# Creator & curator rewards

A portion of every trade's fees is set aside for the people behind the content. Rewards accrue continuously as the token is traded and are paid out in **USDC** on Solana.

## Creator rewards

The original Reddit author earns **0.35% of every trade**. To claim, sign in with the Reddit account that authored the post and submit your Solana wallet — RedCircle verifies that your Reddit username matches the post's author before transferring your accrued USDC balance.

Claims are idempotent: you only ever receive newly-accrued earnings, and concurrent claims are protected by an optimistic lock.

## Curator rewards

If a curator wallet was registered at launch, that wallet earns **0.15% of every trade** for surfacing the post. The curator claims by proving control of the exact wallet registered at launch — no Reddit login required, because the wallet itself is the identity.

> Both creator and curator payouts are sourced from accrued pool earnings and sent from RedCircle's reward wallet on-chain. Each claim waits for confirmation before reporting success, and a transaction signature is returned so you can verify it on a Solana explorer.
