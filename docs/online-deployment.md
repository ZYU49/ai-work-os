# SalesDesk Online Deployment

This guide deploys SalesDesk as an online demo that Allen can open from China.

## Recommended Stack

- App hosting: Vercel
- Database: Neon Postgres
- ORM: Prisma migrations from this repo
- Access control: Basic Auth with `APP_ACCESS_USERNAME` and `APP_ACCESS_PASSWORD`

Official references:

- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel Next.js deployment: https://vercel.com/docs/frameworks/full-stack/nextjs
- Neon Prisma guide: https://neon.com/docs/guides/prisma
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Neon Prisma migrations: https://neon.com/docs/guides/prisma-migrations
- Prisma production migrations: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate

## Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```text
DATABASE_URL=<Neon pooled connection string>
DIRECT_URL=<Neon direct connection string>
OPENAI_API_KEY=<your OpenAI API key>
APP_ACCESS_USERNAME=allen
APP_ACCESS_PASSWORD=<temporary password for Allen>
```

Use a temporary password that is not reused anywhere else.

## Create The Cloud Database

1. Create a Neon project.
2. Open the Neon Connect modal.
3. Copy the pooled connection string and save it as `DATABASE_URL`.
4. Disable the connection pooling toggle or choose the direct connection, then save that string as `DIRECT_URL`.

For Prisma:

- `DATABASE_URL` is used by the running app.
- `DIRECT_URL` is used by `prisma migrate deploy`.

## Deploy Schema To Neon

After Neon is created, run this locally from the repo root:

```powershell
$env:DATABASE_URL = "<Neon pooled connection string>"
$env:DIRECT_URL = "<Neon direct connection string>"
npm run prisma:migrate:deploy
```

Expected result: Prisma applies the migrations in `prisma/migrations`.

## Copy Local Data To Neon

Run this only for the first cloud import, or after clearing the cloud database.

```powershell
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$localDb = "postgresql://postgres:<local-password>@localhost:5432/ai_work_os?schema=public"
$cloudDb = "<Neon direct connection string>"
$backup = "storage\backups\ai_work_os_data.dump"

& "$pgBin\pg_dump.exe" `
  --format=custom `
  --data-only `
  --no-owner `
  --no-privileges `
  --dbname $localDb `
  --file $backup

& "$pgBin\pg_restore.exe" `
  --data-only `
  --no-owner `
  --no-privileges `
  --dbname $cloudDb `
  $backup
```

Expected result: the cloud database contains the same projects, sales records, Midstate records, notes, tasks, and agent data as the local database.

## Deploy The App

1. Push this repo to GitHub.
2. Import the GitHub repo in Vercel.
3. Add the environment variables listed above.
4. Deploy.
5. Open the Vercel URL.
6. Enter the Basic Auth username and password.

Share the Vercel URL and password with Allen.

## Updating The Online Version

- Code changes: push the updated repo, then Vercel redeploys.
- Password changes: update `APP_ACCESS_PASSWORD` in Vercel, then redeploy.
- Database changes: run `npm run prisma:migrate:deploy` with Neon env vars.
- Data refresh: import new Excel/CSV files in the online app, or repeat the data copy after clearing cloud data.

## Current Limitation

The File Center currently stores uploaded files on local disk. Vercel's app filesystem is not persistent storage for user uploads. For a long-term online version, move file uploads to Vercel Blob, S3, OneDrive, or SharePoint. Analytics data, projects, notes, tasks, and mail records are stored in Postgres and are suitable for Neon.
