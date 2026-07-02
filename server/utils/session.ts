import { auth } from "~~/lib/auth";
import type { H3Event } from "h3";

export async function requireUserId(event: H3Event): Promise<string> {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  return session.user.id;
}
