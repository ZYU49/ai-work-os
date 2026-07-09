# SalesDesk

Sales workspace for analytics, customer projects, pasted mail, files, notes, tasks, daily logs, search, and an assistant workspace.

## Requirements

This app uses Next.js 16 and Prisma 7, which require Node 20+. On this machine the default global Node may be older, so npm scripts route through `scripts/use-node24.cjs` and the bundled Codex Node runtime.

## Development

```powershell
npm install
npm run dev
```

Open http://localhost:3000.

## Verification

```powershell
npm run lint
npm run test
npm run build
```

The Prisma and Playwright scripts are present for the MVP plan. Their schema, seed file, and end-to-end tests are added in later tasks.
