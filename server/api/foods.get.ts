import { searchFoods } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q : "";
  const filter =
    query.filter === "my" || query.filter === "catalog" ? query.filter : "all";
  const limit = Math.min(Number(query.limit) || 50, 200);
  return searchFoods(userId, q, filter, limit);
});
