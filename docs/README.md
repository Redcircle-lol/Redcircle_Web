# RedCircle Documentation

This directory holds the source content for the RedCircle docs, served by the web app at [`/docs`](https://redcircle.lol/docs).

Each `.md` file is one documentation page. They are loaded by `apps/web/src/routes/docs.tsx` (via a Vite glob import) and rendered as formatted markdown. The numeric filename prefix controls ordering in the sidebar, and the first `#` heading in each file is used as its page title.

To edit the docs, just change the markdown here — no frontend changes required. To add a page, drop a new `NN-title.md` file in this folder.

## Pages

| File | Page |
| ---- | ---- |
| `01-introduction.md`   | Introduction |
| `02-how-it-works.md`   | How it works |
| `03-core-concepts.md`  | Core concepts |
| `04-getting-started.md`| Getting started |
| `05-launching.md`      | Launching a token |
| `06-trading.md`        | Trading |
| `07-rewards.md`        | Creator & curator rewards |
| `08-fees.md`           | Fee model |
| `09-leaderboard.md`    | Leaderboard & curation |
| `10-architecture.md`   | Architecture |
| `11-partner-api.md`    | Partner API |
| `12-security.md`       | Security & risk |
| `13-faq.md`            | FAQ |
| `14-glossary.md`       | Glossary |
