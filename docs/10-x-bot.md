# X Bot (@redcircle_sol)

RedCircle runs a bot on X (Twitter) — **@redcircle_sol** — that lets anyone tokenize an X post directly from the X feed, without opening the website.

## How it works

1. Find any X post you want to tokenize.
2. Reply to it (or quote-tweet it) and tag **@redcircle_sol** with a launch keyword:

```
@redcircle_sol tokenize
@redcircle_sol launch
@redcircle_sol make it tradable
```

3. The bot replies within ~60 seconds with a pre-filled launch link:

```
Launch a token for this post on Redcircle 🚀

https://www.redcircle.lol/home?x=<tweet_id>

Tap the link → confirm → trade in ~30s.
```

4. Click the link, connect your wallet, and confirm the launch. The token goes live on Solana in about 30 seconds.

## Launch keywords

The bot only responds when it sees clear launch intent. Supported phrases include:

| Phrase | Example |
| ------------------- | ------------------------------------ |
| `tokenize` | `@redcircle_sol tokenize` |
| `launch` | `@redcircle_sol launch this` |
| `launch token` | `@redcircle_sol launch token` |
| `make it tradable` | `@redcircle_sol make it tradable` |

Plain @mentions without a keyword are ignored (no spam replies).

## Already launched posts

If the post already has a token on RedCircle, the bot replies with the existing token page instead of generating a new launch link:

```
This post already has a token on Redcircle 🚀

Trade $SYMBOL on Redcircle:
https://www.redcircle.lol/token/<slug>
```

## Who becomes the curator?

The wallet you connect when you confirm the launch is registered as the **curator** for that token. Curators earn **0.15%** of every trade made on their token, forever. See [Rewards](./07-rewards.md) for details.

## Who becomes the creator?

The original X post author is the **creator**. Once they connect their X account on RedCircle (via the Sign In with X flow), they can claim their **0.40%** creator fee from trading volume. See [Rewards](./07-rewards.md) for details.

## Tips

- **Reply to the post** you want to tokenize — don't just tag the bot in a standalone tweet. The bot resolves the target post from the tweet you're replying to.
- **Quote-tweeting** with a tokenize keyword also works — the bot picks up the quoted post URL automatically.
- The bot deduplicates — tagging it multiple times on the same post gets one reply, not many.
- You can always tokenize manually at [redcircle.lol/home](https://www.redcircle.lol/home) by pasting any X or Reddit post URL directly.
