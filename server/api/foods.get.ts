import { searchFoods } from "~/server/services/repository";
import { requireUserId } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event);
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q : "";
  const filter =
    query.filter === "my" || query.filter === "catalog" ? query.filter : "all";
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(Math.max(1, Number(query.pageSize) || Number(query.limit) || 25), 100);
  return searchFoods(userId, q, filter, page, pageSize);
});
