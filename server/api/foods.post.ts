import { createFood } from "~/server/utils/repository";
import type { Food } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const body = await readBody<Food>(event);
  if (!body.name?.trim()) {
    throw createError({ statusCode: 422, statusMessage: "Food name is required." });
  }
  return createFood(body);
});
