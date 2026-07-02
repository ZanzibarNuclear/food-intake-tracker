import { deleteFood } from "~/server/services/repository";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 422, statusMessage: "Invalid food id." });
  }
  await deleteFood(id);
  return { ok: true };
});
