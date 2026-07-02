import { deleteWeight } from "~/server/services/repository";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 422, statusMessage: "Invalid weight id." });
  }
  await deleteWeight(id);
  return { ok: true };
});
