# AGENTS.md

This project is focused on AI-powered research reports with an open source implementation of deep research using Together AI and Nextj.js.

Users ask questions and get comprehensive, sourced answers through automated research workflows powered by AI + web searches with Exa.

## Commands
- **Dev**: `pnpm dev` - Start Next.js dev server
Never run dev command, consider it as already running.
- **Build**: `pnpm build` - Production build
- **Lint**: `pnpm lint` - Run ESLint via Next.js
- **DB Push**: `pnpm db` - Push Drizzle schema to database, when doing schema changes always remember to launch this command.
- **Workflow**: `pnpm workflow` - Run Upstash QStash dev server

## Architecture
- **Framework**: Next.js 16 (App Router) with React 19, TypeScript (strict mode)
- **Database**: Drizzle ORM with Neon (PostgreSQL serverless) - schema in `src/db/`
- **AI**: Vercel AI SDK with Together AI provider - research logic in `src/deepresearch/`
- **Auth**: Clerk for authentication
- **Queue/Workflow**: Upstash QStash + Workflow for background jobs
- **UI**: Radix primitives, Tailwind CSS 4, Lucide icons, shadcn/ui in `src/components/ui/`

## Code Style
- Use `@/*` path alias for imports from `src/`
- Double quotes for strings (Prettier: `singleQuote: false`)
- Functional React components with TypeScript
- Use Zod for schema validation
- Components: PascalCase files; utilities: camelCase files
