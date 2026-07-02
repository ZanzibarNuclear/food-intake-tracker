import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import type { H3Event } from "h3";
import pg from "pg";
import { Resend } from "resend";
import { normalizeDatabaseUrl } from "~/server/utils/database-url";

type CreateAuthOptions = {
  authBaseUrl: string;
  authSecret: string;
  databaseUrl: string;
  emailFrom: string;
  resend: Resend | null;
  trustedOrigins: string[];
};

function createAuthInstance({ authBaseUrl, authSecret, databaseUrl, emailFrom, resend, trustedOrigins }: CreateAuthOptions) {
  authPool = new pg.Pool({
    connectionString: normalizeDatabaseUrl(databaseUrl),
    ssl: { rejectUnauthorized: true },
  });

  return betterAuth({
    database: authPool,
    secret: authSecret,
    baseURL: authBaseUrl,
    trustedOrigins,
    plugins: [
      magicLink({
        expiresIn: 10 * 60,
        sendMagicLink: async ({ email, url }) => {
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
        },
      }),
    ],
  });
}

let authInstance: ReturnType<typeof createAuthInstance> | null = null;
let authPool: pg.Pool | null = null;

function splitOrigins(value: unknown): string[] {
  return typeof value === "string" ? value.split(",").map((origin) => origin.trim()).filter(Boolean) : [];
}

function localFallbackBaseUrl(): string | undefined {
  return process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";
}

export function getAuth(event: H3Event) {
  const config = useRuntimeConfig(event);
  const databaseUrl = config.databaseUrl;
  const authSecret = config.betterAuthSecret;
  const authBaseUrl = config.betterAuthUrl || localFallbackBaseUrl();

  if (!databaseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: "DATABASE_URL is not configured.",
    });
  }
  if (!authSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: "BETTER_AUTH_SECRET is not configured.",
    });
  }
  if (!authBaseUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: "BETTER_AUTH_URL is not configured.",
    });
  }

  if (authInstance) return authInstance;

  const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
  const emailFrom = config.authEmailFrom || "Food Tracker <onboarding@resend.dev>";
  const trustedOrigins = [
    authBaseUrl,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    "http://127.0.0.1:4177",
    "http://localhost:4177",
    ...splitOrigins(config.betterAuthTrustedOrigins),
  ].filter((origin): origin is string => Boolean(origin));

  const createdAuth = createAuthInstance({ authBaseUrl, authSecret, databaseUrl, emailFrom, resend, trustedOrigins });
  authInstance = createdAuth;
  return createdAuth;
}
