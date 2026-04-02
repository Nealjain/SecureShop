import { mutation } from "./_generated/server";
import { v } from "convex/values";

/** Clear all data — run before re-seeding: npx convex run seed:clearAll */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["users", "products", "orders", "sessions", "token_vault", "audit_logs"] as const) {
      const docs = await ctx.db.query(table).collect();
      for (const d of docs) await ctx.db.delete(d._id);
    }
    return { message: "All data cleared ✅" };
  },
});

/** Seed sample data: npx convex run seed:seedAll */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const existingProducts = await ctx.db.query("products").collect();
    if (existingProducts.length === 0) {
      const now = new Date().toISOString();
      const products = [
        { name: "Wireless Headphones Pro", price: 2999, category: "Electronics",
          description: "Premium noise-cancelling wireless headphones with 30hr battery", stock: 50, image: "🎧" },
        { name: "Smart Watch Series X", price: 4999, category: "Electronics",
          description: "Advanced smartwatch with health tracking and AMOLED display", stock: 30, image: "⌚" },
        { name: "Mechanical Keyboard RGB", price: 1799, category: "Electronics",
          description: "Tactile mechanical switches with per-key RGB backlight", stock: 40, image: "⌨️" },
        { name: "Laptop Stand Aluminium", price: 899, category: "Accessories",
          description: "Ergonomic aluminium laptop stand, adjustable 6 angles", stock: 100, image: "💻" },
        { name: "USB-C Hub 7-in-1", price: 1299, category: "Accessories",
          description: "7-port USB-C hub with 4K HDMI, SD card, 100W PD", stock: 75, image: "🔌" },
        { name: "Webcam 4K Ultra HD", price: 3499, category: "Electronics",
          description: "4K webcam with auto-focus and noise cancellation", stock: 25, image: "📷" },
        { name: "Portable SSD 1TB", price: 5999, category: "Storage",
          description: "NVMe portable SSD, 1050MB/s read, USB 3.2 Gen 2", stock: 20, image: "💾" },
        { name: "Noise Cancelling Earbuds", price: 2499, category: "Electronics",
          description: "True wireless earbuds with ANC and 24hr total battery", stock: 60, image: "🎵" },
      ];
      for (const p of products) {
        await ctx.db.insert("products", { ...p, created_at: now, record_hash: `seed-${p.name}` });
      }
    }

    // Sample flagged order for demo
    const existingOrders = await ctx.db.query("orders").collect();
    if (existingOrders.length === 0) {
      await ctx.db.insert("orders", {
        user_id: "demo",
        items: [{ product_id: "demo", name: "Smart Watch Series X", price: 4999, qty: 12, line_total: 59988 }],
        total: 59988,
        payment_token: "FLAGZ9A1B2C3D4E5",
        card_last4: "9999",
        card_brand: "Visa",
        status: "flagged",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        integrity_hash: "demo-hash",
        fraud_result: {
          is_fraudulent: true, risk_level: "critical",
          combined_risk_score: 0.82, ml_risk_score: 0.71, rule_risk_score: 75,
          identity_risk_score: 40,
          flags: [
            "HIGH_VALUE: Transaction ₹59988 exceeds ₹50,000 threshold",
            "VELOCITY_QUANTITY: 12 items ordered (threshold: 10)",
            "ML_ANOMALY: Isolation Forest score=0.712",
          ]
        },
        record_hash: "demo-record-hash",
      });
    }

    return { message: "Seed complete ✅" };
  },
});
