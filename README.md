FetchAsset helps agencies collect files and information from clients through one shared project page.

<p align="center">
  <img src="public/favicon.svg" width="112" alt="FetchAsset F and paperclip icon" />
</p>

<h1 align="center">FetchAsset</h1>

<p align="center"><strong>Less chasing. Clearer handoffs.</strong></p>
<p align="center">A client asset collection workspace for agencies, with shareable portals, submission review and AI-assisted checks.</p>

<p align="center">
  <strong>English</strong> · <a href="README.tr.md">Türkçe</a><br />
  <a href="#try-the-workflow"><strong>Explore the workflow</strong></a> ·
  <a href="https://fetch-asset.vercel.app">Project website</a> ·
  <a href="#run-locally">Local setup</a>
</p>

---

Create a project, specify what you need from a client, and share one portal link. Clients can submit files and answers without creating an agency account. Review submissions, request revisions, and keep the project's requirements, deadlines and progress together.

**This repository contains a service-backed web application and a separate guided demo.** Supabase, Groq, MailerSend and Stripe integrations require their own configuration. The guided demo uses simulated interactions and does not validate live uploads, email delivery or billing.

## Try the workflow

| Area | What to expect |
| --- | --- |
| Guided demo | `/demo`, with a sample project and simulated upload |
| Agency workspace | Authenticated dashboard, projects, requests and review |
| Client portal | Token-based `/portal/[token]` links |
| Data and storage | Supabase database, Auth and Storage |
| AI review | Groq with the configured Llama 3.3 model |

1. Follow the local setup below, then open [localhost:3000/demo](http://localhost:3000/demo) to explore the guided example.
2. For a real project, configure Supabase, sign in and create a project with its client details and asset requests.
3. Share the generated portal link with the intended client.
4. Review submitted files or answers, approve them or ask for revisions, and download approved assets through signed links.

## Inside the workspace

- **Project-specific requests.** Collect files, text, URLs and multiple-choice answers with requirements and supporting notes.
- **A simple client portal.** Clients follow a project link, view the checklist and submit the requested material.
- **A review dashboard.** Inspect submissions, track status, approve work or provide revision feedback.
- **AI-assisted checks.** Produce a structured score, issues and suggestions from submission text or metadata.
- **Agency branding.** Configure logos, colors, welcome text and other portal presentation settings.
- **Deadlines and communication.** Record project deadlines and buffers, send submission/review notifications, and invoke reminder checks for missing items.
- **Billing integration.** Stripe Checkout, billing portal and webhook routes connect subscription plans to usage limits.

For files, the AI audit evaluates metadata such as name, type and size. It does not inspect the uploaded file's contents. Human review remains part of the asset handoff.

## Run locally

The lockfile records **Next.js 14.2.35** and **React 18.3.1**. The application uses TypeScript and Tailwind CSS 3. Select a Node.js version compatible with the dependency engines in `package-lock.json`.

```bash
git clone https://github.com/ArdaHFO/fetch-asset.git
cd fetch-asset
npm ci
```

Copy [.env.local.example](.env.local.example) to `.env.local` and replace its placeholders. Keep secrets out of version control.

| Configuration | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server Supabase access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side administrative operations |
| `GROQ_API_KEY` | AI submission checks |
| `MAILERSEND_API_KEY`, `MAILERSEND_SENDER_EMAIL`, `MAILERSEND_SENDER_NAME` | Transactional notifications |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout and webhook integration |
| `STRIPE_SOLO_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID` | Plan prices when enabling paid plans |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PORTAL_URL` | App and portal base URLs |

The sample environment file does not list `STRIPE_SOLO_PRICE_ID`, but [the plan configuration](src/lib/stripe/plans.ts) reads it. The active mail implementation uses **MailerSend**. Auth emails are sent through Supabase Auth, whose SMTP configuration is separate.

For a fresh Supabase project, review and apply [migrations 001 through 009](supabase/migrations/) in order. They include the database schema, row-level policies, storage buckets and later feature additions. Configure your Auth site URL and callback at `http://localhost:3000/auth/callback`.

Set both app URLs to `http://localhost:3000` for local work. Review the deployment-specific Supabase host in [next.config.js](next.config.js) when using your own project.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). Development commands are:

```bash
npm run lint
npm run build
npm start
```

These commands were not executed for this documentation update. Stripe additionally requires a webhook destination at `/api/stripe/webhook` and matching test or live credentials. Validate a complete checkout and webhook round trip before enabling paid access.

## Design and development

FetchAsset's existing interface uses a hand-drawn visual style. Preserve the irregular corners, hard offset shadows, paper background, **Kalam** headings and **Patrick Hand** body font when extending it.

| Primitive | Implementation |
| --- | --- |
| Buttons | [WobblyButton](src/components/ui/wobbly-button.tsx) |
| Cards | [WobblyCard](src/components/ui/wobbly-card.tsx) |
| Inputs and form fields | [WobblyInput](src/components/ui/wobbly-input.tsx) |
| Palette, typography and shadows | [Tailwind configuration](tailwind.config.ts) |

The core palette uses paper `#fdfbf7`, ink `#2d2d2d`, accent `#ff4d4d`, blue `#2d5da1` and post-it yellow `#fff9c4`. The existing [contributor instructions](.github/copilot-instructions.md) document the design conventions. Their original step checklist is historical and does not describe the current source tree.

## Validation and current limits

This documentation was checked against routes, service adapters, SQL migrations, package metadata and the environment template. No application build, migration, live upload, AI request, email or payment was run.

- The guided demo simulates an upload and review. It is separate from the real portal.
- File audits are metadata-based. Text audits pass up to 2,000 characters of submitted text to the model.
- The submission route starts its AI audit with a non-blocking HTTP request. The repository does not establish a durable background queue for that work.
- Reminder checks are exposed through an authenticated endpoint. A deployed automatic schedule must be configured and verified separately.
- The webhook maps configured price IDs to Solo, Pro and Agency. Validate plan assignment with a complete checkout and webhook round trip before enabling paid access.
- No automated test script or CI workflow is included in the inspected tree. The build configuration skips ESLint during builds, so a successful build would not establish lint success.
- Storage policies, portal authorization, provider availability and delivery behavior need validation in the intended deployment.

## Project map

```text
src/app/               Landing, dashboard, portal, demo and API routes
src/components/        Feature components and hand-drawn UI primitives
src/lib/               Supabase, AI, email, Stripe and utility modules
supabase/migrations/   Database, access policies and storage setup
public/                Existing brand and decorative assets
.env.local.example     Environment variable template
```

## Documentation and contributions

- [Environment template](.env.local.example) · [Database migrations](supabase/migrations/)
- [AI audit implementation](src/lib/ai/audit.ts)
- [Email service](src/lib/email/index.ts) · [Billing plans](src/lib/stripe/plans.ts)
- [Design conventions](.github/copilot-instructions.md)
- [Issues and feature requests](https://github.com/ArdaHFO/fetch-asset/issues)

For bug reports, identify the agency or client flow, request type, observed status and reproduction steps. Use sample files and redact portal tokens, credentials and client information. Pull requests should preserve the established UI style and describe which integrations were actually exercised.

## License and credits

`package.json` declares **ISC**, but no standalone license file is included in the repository. This documentation does not add or change licensing terms. Existing brand assets, fonts and third-party packages retain their respective rights and notices.
