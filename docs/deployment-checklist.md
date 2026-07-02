# Deployment Checklist

Use this before promoting Daily Nutrition Tracker to production.

## Resend

- Add and verify a sending domain in Resend.
- Prefer a sending subdomain, such as `login.example.com`, instead of the root domain.
- Create an API key scoped to this app.
- Set `AUTH_EMAIL_FROM` to a verified sender, for example:

```bash
AUTH_EMAIL_FROM="Daily Nutrition Tracker <login@example.com>"
```

## Vercel Environment

Set these variables for Production. Set Preview too if preview deployments should use a separate database branch.

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://your-production-domain.example
BETTER_AUTH_TRUSTED_ORIGINS=https://your-production-domain.example
RESEND_API_KEY=re_...
AUTH_EMAIL_FROM="Daily Nutrition Tracker <login@example.com>"
```

Generate a strong auth secret:

```bash
openssl rand -base64 32
```

After changing Vercel environment variables, redeploy. Existing deployments do not pick up changed values.

## Database

Run against the production database after confirming `DATABASE_URL` points at production:

```bash
npm run auth:migrate
npm run db:migrate
npm run db:seed:catalog
```

Seed personal workbook data only after the target user has signed in once:

```bash
USER_EMAIL="you@example.com" npm run db:seed:user
```

## Pre-Push Checks

```bash
npm run typecheck
npm run build
```

## Production Smoke Test

- Request a magic link and confirm the email arrives.
- Sign in from the production link.
- Confirm Dashboard, Meals, Weight, Foods, and Settings load.
- Log a meal with multiple foods.
- Log or update today's weight.
- Favorite a food and add it from the meal form.
- Edit alias, timezone, calorie target, protein target, and goal weight.
- Merge or archive only on nonessential test foods.
