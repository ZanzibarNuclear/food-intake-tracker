import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import pg from "pg";
import { Resend } from "resend";
import "../scripts/load-env.mjs";
import { normalizeDatabaseUrl } from "../server/utils/database-url";

const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.BETTER_AUTH_SECRET;
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.AUTH_EMAIL_FROM ?? "Food Tracker <onboarding@resend.dev>";
const authBaseUrl =
  process.env.BETTER_AUTH_URL ??
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Better Auth. Check .env.local.");
}

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is required for Better Auth. Check .env.local.");
}

const authPool = new pg.Pool({
  connectionString: normalizeDatabaseUrl(databaseUrl),
  ssl: { rejectUnauthorized: true },
});

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function configuredTrustedOrigins(): string[] {
  return [
    authBaseUrl,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    "http://127.0.0.1:4177",
    "http://localhost:4177",
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin));
}

async function sendMagicLink(email: string, url: string) {
  if (!resend) {
    console.info(`[auth] Magic link for ${email}: ${url}`);
    return;
  }

  await resend.emails.send({
    from: emailFrom,
    to: email,
    subject: "Sign in to Food Tracker",
    text: `Sign in to Food Tracker:\n\n${url}\n\nThis link expires shortly.`,
    html: `<p>Sign in to Food Tracker:</p><p><a href="${url}">Open Food Tracker</a></p><p>This link expires shortly.</p>`,
  });
}

export const auth = betterAuth({
  database: authPool,
  secret: authSecret,
  baseURL: authBaseUrl,
  trustedOrigins: configuredTrustedOrigins(),
  plugins: [
    magicLink({
      expiresIn: 10 * 60,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink(email, url);
      },
    }),
  ],
});
