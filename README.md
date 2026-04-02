# Draw Me

Draw Me is a lightweight private drawing inbox built with Next.js. Enter your name, generate a public drawing link plus a private owner link, then collect sketches that only the owner can view.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite
- react-konva for the drawing canvas

## Quick start
```bash
npm install
npm run dev
```

## Environment
Create `.env`:
```bash
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Flow
- Sign up on `/` with only your display name.
- Receive a public share link at `/<slug>`.
- Receive a private owner link at `/owner/<token>`.
- Friends submit a drawing and optional anonymous note.
- Only the owner link can view or delete saved submissions.

## Notes
- The app auto-creates its SQLite tables at runtime through `lib/db-init.ts`.
- If an older database schema is detected, the local database is reset to the new private-inbox shape.
- `/create` redirects to `/`, and legacy dashboard/gallery routes are retired.

## Scripts
- `npm run dev` - start the dev server
- `npm run build` - production build
- `npm run start` - serve the production build
- `npm run lint` - lint the project
- `npm run db:seed` - seed a demo private inbox
