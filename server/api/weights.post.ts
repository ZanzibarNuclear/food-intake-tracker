import { createWeight } from "~/server/utils/repository";
import type { WeightEntry } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const body = await readBody<WeightEntry>(event);
  if (!body.date || !Number.isFinite(Number(body.weight))) {
    throw createError({ statusCode: 422, statusMessage: "Date and weight are required." });
  }
  return createWeight(body);
});
