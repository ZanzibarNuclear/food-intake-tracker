import { updateSettings } from "~/server/services/repository";
import type { TrackerSettings } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const body = await readBody<TrackerSettings>(event);
  return updateSettings(body);
});
