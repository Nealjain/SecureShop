import os

boilerplate = """import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

export const create = mutation({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.insert("{table}", args),
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
    let q = ctx.db.query("{table}");
    if (args && args.limit) {
      const all = await q.collect();
      return all.slice(0, args.limit);
    }
    return await q.collect();
  },
});

export const count = query({
  args: v.any(),
  handler: async (ctx) => (await ctx.db.query("{table}").collect()).length,
});
"""

files = {
    "products.ts": boilerplate.replace("{table}", "products"),
    "audit_logs.ts": boilerplate.replace("{table}", "audit_logs"),
    "users.ts": boilerplate.replace("{table}", "users") + """
export const getByEmail = query({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.query("users").withIndex("by_email_hash", q => q.eq("email_hash", args.email_hash)).first(),
});
""",
    "orders.ts": boilerplate.replace("{table}", "orders") + """
export const listByUser = query({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.query("orders").withIndex("by_user", q => q.eq("user_id", args.user_id)).collect(),
});
""",
    "sessions.ts": boilerplate.replace("{table}", "sessions") + """
export const getByToken = query({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.query("sessions").withIndex("by_token_hash", q => q.eq("token_hash", args.token_hash)).first(),
});
export const listByUser = query({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.query("sessions").withIndex("by_user", q => q.eq("user_id", args.user_id)).collect(),
});
export const deactivateAllByUser = mutation({
  args: v.any(),
  handler: async (ctx, args) => {
    const all = await ctx.db.query("sessions").withIndex("by_user", q => q.eq("user_id", args.user_id)).collect();
    let count = 0;
    for (const session of all) {
      if (session.is_active) {
        await ctx.db.patch(session._id, { is_active: false });
        count++;
      }
    }
    return count;
  },
});
""",
    "token_vault.ts": boilerplate.replace("{table}", "token_vault") + """
export const getByToken = query({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.query("token_vault").withIndex("by_token_hash", q => q.eq("token_hash", args.token_hash)).first(),
});
export const listByUser = query({
  args: v.any(),
  handler: async (ctx, args) => await ctx.db.query("token_vault").withIndex("by_user", q => q.eq("user_id", args.user_id)).collect(),
});
"""
}

# The previous logic had a custom list in audit_logs, we will add timestamp sorting back
files["audit_logs.ts"] += """
export const listByTimestamp = query({
  args: v.any(),
  handler: async (ctx, args) => {
    let all = await ctx.db.query("audit_logs").withIndex("by_timestamp").order("desc").collect();
    return args && args.limit ? all.slice(0, args.limit) : all;
  }
});
"""
# Overwrite list in audit logs to use timestamp
files["audit_logs.ts"] = files["audit_logs.ts"].replace(
  """export const list = query({
  args: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db.query("audit_logs");
    if (args && args.limit) {
      const all = await q.collect();
      return all.slice(0, args.limit);
    }
    return await q.collect();
  },
});""",
  """export const list = query({
  args: v.any(),
  handler: async (ctx, args) => {
    let all = await ctx.db.query("audit_logs").withIndex("by_timestamp").order("desc").collect();
    if (args && args.limit) return all.slice(0, args.limit);
    return all;
  },
});"""
)

for filename, text in files.items():
    with open(f"/Users/nealmanawat/Developer/E /secure-ecommerce/convex/convex/{filename}", "w") as f:
        f.write(text)

print("Convex API scripts redefined purely on generic data architectures.")
