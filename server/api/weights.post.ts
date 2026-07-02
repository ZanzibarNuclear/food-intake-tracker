import { upsertWeight } from "~/server/services/repository";
import type { WeightEntry } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const body = await readBody<WeightEntry>(event);
  if (!body.date || body.weight === undefined) {
    throw createError({ statusCode: 422, statusMessage: "Date and weight are required." });
  }
  return upsertWeight(body);
});
