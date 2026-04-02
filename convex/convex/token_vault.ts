import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { data: v.string() },
  handler: async (ctx, args) => ctx.db.insert("token_vault", args),
});

export const getById = query({
  args: { id: v.id("token_vault") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("token_vault").collect(),
});

export const remove = mutation({
  args: { id: v.id("token_vault") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id); },
});

export const count = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("token_vault").collect()).length,
});
