FetchAsset collects client files and answers through a shared project page.


<p align="center">
  <img src="public/favicon.svg" width="112" alt="FetchAsset F and paperclip icon" />
</p>

<h1 align="center">FetchAsset</h1>

<p align="center">
  <strong>English</strong> · <a href="README.tr.md">Türkçe</a><br />
  <a href="#try-the-workflow"><strong>Explore the workflow</strong></a> ·
  <a href="https://fetch-asset.vercel.app">Project website</a> ·
  <a href="#run-locally">Local setup</a>
</p>

An agency creates a checklist and sends the client a portal link. Clients can submit material without an agency account; the agency can approve it or request revisions. Supabase handles accounts, data and storage, with Groq, MailerSend and Stripe integrations for review, email and billing.

## Try the workflow

1. Follow the local setup below, then open [localhost:3000/demo](http://localhost:3000/demo) to explore the guided example.
2. For a real project, configure Supabase, sign in and create a project with its client details and asset requests.
3. Share the generated portal link with the intended client.
4. Review submitted files or answers, approve them or ask for revisions, and download approved assets through signed links.

The `/demo` example uses simulated upload and review interactions. It does not exercise real storage, email or billing.

## Features

- Requests for files, text, URLs and multiple-choice answers.
- Submission status, approvals and revision feedback.
- Portal logos, colors and welcome text.
- Project deadlines, buffers, notifications and reminder checks.
- AI scores, issues and suggestions from submitted text or file metadata.
- Stripe Checkout, billing portal and webhook routes tied to plan limits.

File audits use the filename, type and size, not the file contents. Text audits send up to 2,000 characters to the model.

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

Stripe also requires a webhook destination at `/api/stripe/webhook` and matching test or live credentials. Validate a complete checkout and webhook round trip before enabling paid access.

## Design and development

The interface uses irregular corners, offset shadows, a paper background, **Kalam** headings and **Patrick Hand** body text. Reuse the existing components when adding screens.

| Primitive | Implementation |
| --- | --- |
| Buttons | [WobblyButton](src/components/ui/wobbly-button.tsx) |
| Cards | [WobblyCard](src/components/ui/wobbly-card.tsx) |
| Inputs and form fields | [WobblyInput](src/components/ui/wobbly-input.tsx) |
| Palette, typography and shadows | [Tailwind configuration](tailwind.config.ts) |

The core palette uses paper `#fdfbf7`, ink `#2d2d2d`, accent `#ff4d4d`, blue `#2d5da1` and post-it yellow `#fff9c4`. The existing [contributor instructions](.github/copilot-instructions.md) document the design conventions. Their original step checklist is historical and does not describe the current source tree.

## Limitations

- Submission starts its AI audit with a non-blocking HTTP request. There is no durable background queue for it.
- The reminder endpoint requires authentication. Automatic reminders need a separately configured schedule.
- Stripe price IDs map to Solo, Pro and Agency. Check plan assignment through a complete checkout/webhook cycle before enabling paid access.
- There is no automated test script or CI workflow. Builds skip ESLint, so run lint separately.
- Check storage policies, portal authorization and service delivery in your deployment.

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

For bugs, describe the agency or client flow, request type, observed status and steps to reproduce. Use sample files and remove portal tokens, credentials and client information.

## License

`package.json` declares **ISC**, but the repository has no standalone license file. Brand assets, fonts and dependencies retain their own rights and notices.
