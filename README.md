This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Quality Gates & Testing

### Pre-Deployment Checklist

Before merging to `master`:

```bash
pnpm test:coverage   # Coverage ≥ 80% (branches ≥ 80)
pnpm lint            # ESLint + complexity rules
npx tsc --noEmit     # TypeScript strict mode
pnpm check-quality   # File size & CC limits
npx next build       # Next.js build validation
```

### Manual Smoke Test

After deployment to staging, run the **[Smoke Test Manual](./SMOKE_TEST.md)** to validate:

- Login flow and authentication
- Dashboard rendering (charts, metrics)
- File upload handling
- Protheus synchronization
- Tenant isolation (RLS)
- Error handling and timeouts

Estimated time: 5–7 minutes.

## Architecture & Refactoring

This project follows **REFACTORING_POLICY** (see `docs/REFACTORING_POLICY.md`):

- **Clean Architecture:** UI ↔ Hooks ↔ Domain ↔ Infrastructure
- **SOLID principles:** Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
- **Complexity limits:** CC ≤ 10 per function, ≤ 100 lines per component, ≤ 200 lines per file
- **Test coverage:** ≥ 80% (§3.4)

Context graph: `graft/INDEX.md` (run `graft map` for orientation)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
