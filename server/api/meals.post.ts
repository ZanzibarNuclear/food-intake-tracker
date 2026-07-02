import { createMeal } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";
import type { MealEntry } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  const body = await readBody<MealEntry>(event);
  if (!body.date || !body.meal || (body.foodId === undefined && !body.foodName?.trim())) {
    throw createError({ statusCode: 422, statusMessage: "Date, meal, and food are required." });
  }
  return createMeal(userId, body);
});
