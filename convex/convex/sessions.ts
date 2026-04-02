import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { data: v.string() },
  handler: async (ctx, args) => ctx.db.insert("sessions", args),
});

export const getById = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("sessions").collect(),
});

export const update = mutation({
  args: { id: v.id("sessions"), data: v.string() },
  handler: async (ctx, { id, data }) => { await ctx.db.patch(id, { data }); },
});

export const remove = mutation({
  args: { id: v.id("sessions") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id); },
});

export const count = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("sessions").collect()).length,
});
