import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

export const create = mutation({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.insert("products", args),
});

export const update = mutation({
  args: v.any(),
  handler: async (ctx, args) => { await ctx.db.patch(args.id, args.fields); },
});

export const remove = mutation({
  args: v.any(),
  handler: async (ctx, args) => { await ctx.db.delete(args.id); },
});

export const list = query({
  args: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db.query("products");
    if (args && args.limit) {
      const all = await q.collect();
      return all.slice(0, args.limit);
    }
    return await q.collect();
  },
});

export const count = query({
  args: v.any(),
  handler: async (ctx) => (await ctx.db.query("products").collect()).length,
});
