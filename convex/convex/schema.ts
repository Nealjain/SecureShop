import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Encryption architecture:
 *
 * products    → plain fields (public catalogue, no sensitive data)
 *
 * ALL other tables → single column `data` only
 *   `data` = AES-256-GCM( JSON.stringify(allFields) )
 *   Nothing is readable in the database without the AES key.
 *   Convex _id and _creationTime are the only system-visible fields.
 */
export default defineSchema({

  products: defineTable({
    name:        v.string(),
    price:       v.number(),
    category:    v.string(),
    description: v.string(),
    stock:       v.number(),
    image:       v.optional(v.string()),
    created_at:  v.string(),
    record_hash: v.string(),
  }),

  users:       defineTable({ data: v.string() }),
  orders:      defineTable({ data: v.string() }),
  sessions:    defineTable({ data: v.string() }),
  token_vault: defineTable({ data: v.string() }),
  audit_logs:  defineTable({ data: v.string() }),

});
