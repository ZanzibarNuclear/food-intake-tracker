import { createFood } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";
import type { Food } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  const body = await readBody<Food>(event);
  if (!body.name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: "Food name is required." });
  }
  if (!body.servingDescription?.trim()) {
    throw createError({ statusCode: 422, statusMessage: "Serving description is required." });
  }
  return createFood(userId, { ...body, isSystemSeed: false, source: body.source ?? "user" });
});
