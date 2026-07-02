import { updateFood } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";
import type { Food } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 422, statusMessage: "Invalid food id." });
  }
  const body = await readBody<Food>(event);
  return updateFood(userId, id, body);
});
