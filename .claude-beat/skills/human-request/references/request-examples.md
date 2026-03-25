# Human Request Examples

Real-world examples of well-structured human-request issues. Use these as templates when creating new requests.

---

## Example 1: API Key Request

**Title:** `needs-human: provide OpenAI API key for AI summary feature`

```markdown
## What Is Needed

An OpenAI API key with access to the GPT-4 API (`OPENAI_API_KEY`).

## Why

Issue #12 (feat: add AI-powered task summaries) requires calling the OpenAI Chat Completions API. The feature is fully implemented and tested with mocks, but cannot be deployed without a live API key.

## Where to Get It

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it something like "claude-beat-prod"
4. Copy the key (starts with `sk-`)

**Billing note:** Ensure the account has a payment method and sufficient credits. GPT-4 usage is estimated at ~$5/month for this feature.

## How to Provide

Add to the `.env` file as:
```
OPENAI_API_KEY=sk-your-key-here
```
Then push the change, or set it as a GitHub repository secret named `OPENAI_API_KEY`.

## Impact

- **Blocked work:** Issue #12 — AI-powered task summaries
- **Priority:** P1

---

> @owner — this issue requires your action. The agent cannot deploy the AI summary feature until the API key is provided.
```

---

## Example 2: Platform Access

**Title:** `needs-human: enable auto-deploy on Render for main branch`

```markdown
## What Is Needed

Enable automatic deploys from the `main` branch on the Render dashboard for the web service.

## Why

Currently, every merge to `main` requires a manual deploy trigger. Enabling auto-deploy will allow the agent to ship features end-to-end without human intervention for routine deployments.

## Where to Get It

1. Go to the Render dashboard → select the web service
2. Navigate to Settings → Build & Deploy
3. Set "Auto-Deploy" to "Yes"
4. Ensure the branch is set to `main`

## How to Provide

Comment on this issue confirming auto-deploy is enabled.

## Impact

- **Blocked work:** All future deployments require manual trigger until this is done
- **Priority:** P1

---

> @owner — this issue requires your action. The agent cannot auto-deploy merged PRs until Render auto-deploy is enabled.
```

---

## Example 3: Configuration Decision

**Title:** `needs-human: confirm subscription pricing tiers for billing page`

```markdown
## What Is Needed

Final pricing for the subscription tiers:
- **Free tier:** feature limits and name
- **Pro tier:** price (monthly/annual), feature limits, name
- **Enterprise tier:** whether to include it, pricing model (contact-us vs. fixed)

## Why

Issue #28 (feat: add subscription billing page) has the UI and Stripe integration scaffolded, but placeholder prices. Cannot launch without confirmed pricing.

## Where to Get It

This is a business decision. Check if there are notes in:
- Any pricing docs or spreadsheets
- Competitor analysis notes
- Previous discussions with stakeholders

## How to Provide

Comment on this issue with the pricing details in this format:
```
Free: $0/mo — up to X tasks, Y projects
Pro: $Z/mo ($W/yr) — up to X tasks, Y projects, feature A, feature B
Enterprise: contact-us / $Z/mo — unlimited everything
```

## Impact

- **Blocked work:** Issue #28 — subscription billing page
- **Priority:** P1

---

> @owner — this issue requires your action. The billing page is ready but needs final pricing before it can go live.
```

---

## Example 4: Secret / Credential Bundle

**Title:** `needs-human: provide Supabase credentials for database migration`

```markdown
## What Is Needed

Three Supabase credentials for the production project:
1. `SUPABASE_URL` — the project URL (e.g., `https://abc123.supabase.co`)
2. `SUPABASE_ANON_KEY` — the public anonymous key
3. `SUPABASE_SERVICE_ROLE_KEY` — the service role key (for server-side operations)

## Why

The app is currently using a local SQLite database. Issue #5 (migrate to Supabase) requires these credentials to connect to the hosted database. All migration scripts are written and tested locally.

## Where to Get It

1. Go to https://supabase.com/dashboard
2. Select the project (or create one if it doesn't exist yet)
3. Navigate to Settings → API
4. Copy the three values listed under "Project URL", "anon public", and "service_role" (secret)

**If no Supabase project exists yet:**
1. Go to https://supabase.com/dashboard → "New Project"
2. Choose a name and region (closest to target users)
3. Set a database password (save it somewhere safe)
4. Wait for the project to spin up, then copy the credentials from Settings → API

## How to Provide

Add all three to the `.env` file:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
Then push the change. Do NOT commit these to a public repo — use GitHub secrets if the repo is public.

## Impact

- **Blocked work:** Issue #5 — migrate to Supabase
- **Priority:** P0

---

> @owner — this issue requires your action. The database migration is fully prepared but cannot proceed without Supabase credentials.
```

---

## Example 5: Manual External Action

**Title:** `needs-human: verify custom domain DNS records for production`

```markdown
## What Is Needed

Add DNS records to point `app.example.com` to the Render web service.

## Why

Issue #15 (feat: custom domain setup) is complete on the Render side — the custom domain is added and waiting for DNS verification. The domain registrar requires manual DNS record updates.

## Where to Get It

1. Go to the Render dashboard → your web service → Settings → Custom Domains
2. Note the required DNS records (likely a CNAME pointing to `*.onrender.com`)
3. Go to your domain registrar (e.g., Namecheap, Cloudflare, GoDaddy)
4. Add the DNS records as shown in the Render dashboard
5. Wait for propagation (usually 5–30 minutes, up to 48 hours)

## How to Provide

Comment on this issue once the DNS records are added. The agent will verify propagation in the next session.

## Impact

- **Blocked work:** Issue #15 — custom domain setup
- **Priority:** P2

---

> @owner — this issue requires your action. The custom domain is configured on Render but DNS records need to be updated at your domain registrar.
```

---

## Anti-Patterns

### Too vague

> "Need API key for the project."

Missing: which key, why, where to get it, how to provide it.

### No mention of the human

> Issue created but no @mention and not assigned to anyone.

The human may never see it. Always assign and @mention.

### Duplicate request

> Creating a new issue when one already exists for the same credential.

Always search `gh issue list --state all --label needs-human` first.

### Not batched

> Three separate issues for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Combine related credentials into a single issue.
