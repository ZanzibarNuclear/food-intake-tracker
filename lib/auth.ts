import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import pg from "pg";
import { Resend } from "resend";
import { normalizeDatabaseUrl } from "../server/utils/database-url";

const databaseUrl = process.env.DATABASE_URL;
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.AUTH_EMAIL_FROM ?? "Food Tracker <onboarding@resend.dev>";

const authPool = new pg.Pool({
  connectionString: databaseUrl ? normalizeDatabaseUrl(databaseUrl) : undefined,
  ssl: databaseUrl ? { rejectUnauthorized: true } : undefined,
});

const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((origin) => origin.trim()),
  plugins: [
    magicLink({
      expiresIn: 10 * 60,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLink(email, url);
      },
    }),
  ],
});
