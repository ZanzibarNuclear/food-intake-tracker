import { updateMeal } from "~/server/services/repository";
import type { MealEntry } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 422, statusMessage: "Invalid meal id." });
  }
  const body = await readBody<MealEntry>(event);
  return updateMeal(id, body);
});
