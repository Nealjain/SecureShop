import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: v.any(),
  handler: async (ctx, args) => ctx.db.insert("audit_logs", args),
});

export const getById = query({
  args: { id: v.id("audit_logs") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("audit_logs").collect(),
});

export const remove = mutation({
  args: { id: v.id("audit_logs") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id); },
});

export const count = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("audit_logs").collect()).length,
});
