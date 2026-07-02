import { getTrackerData } from "~/server/services/repository";

export default defineEventHandler(async () => getTrackerData());
