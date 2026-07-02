import { mergeFood } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ targetFoodId?: number | string }>(event);
  const targetFoodId = Number(body.targetFoodId);

  if (!Number.isFinite(id) || !Number.isFinite(targetFoodId)) {
    throw createError({ statusCode: 422, statusMessage: "Invalid food id." });
  }

  return mergeFood(userId, id, targetFoodId);
});
