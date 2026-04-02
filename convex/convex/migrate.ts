import { mutation } from "./_generated/server";

/** Delete ALL documents from all tables so schema can be changed safely */
export const deleteEverything = mutation({
  args: {},
  handler: async (ctx) => {
    let count = 0;
    for (const table of ["users", "products", "orders", "sessions", "token_vault", "audit_logs"] as const) {
      const docs = await ctx.db.query(table).collect();
      for (const d of docs) {
        await ctx.db.delete(d._id);
        count++;
      }
    }
    return { deleted: count };
  },
});
