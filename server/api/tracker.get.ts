import { getTrackerData } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  return getTrackerData(userId);
});
