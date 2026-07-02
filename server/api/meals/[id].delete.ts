import { deleteMeal } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 422, statusMessage: "Invalid meal id." });
  }
  await deleteMeal(userId, id);
  return { ok: true };
});
