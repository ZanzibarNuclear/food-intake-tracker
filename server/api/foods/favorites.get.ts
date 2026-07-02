import { getFoodQuickList } from "~/server/services/repository";

export default defineEventHandler(async () => getFoodQuickList());
