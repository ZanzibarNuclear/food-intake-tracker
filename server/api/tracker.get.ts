import { getTrackerData } from "~/server/utils/repository";

export default defineEventHandler(async () => getTrackerData());
