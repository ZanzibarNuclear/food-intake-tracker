import { updateSettings } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";
import type { TrackerSettings } from "~/types/nutrition";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  const body = await readBody<TrackerSettings>(event);
  return updateSettings(userId, body);
});
