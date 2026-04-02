import glob
import re

for filepath in glob.glob("/Users/nealmanawat/Developer/E /secure-ecommerce/convex/convex/*.ts"):
    if "schema.ts" in filepath or "_generated" in filepath: continue
    
    with open(filepath, 'r') as f:
        content = f.read()

    # Fix argument references broken by generic payload migration
    content = re.sub(r'\bctx\.db\.get\(id\)', 'ctx.db.get(args.id)', content)
    content = re.sub(r'\bctx\.db\.patch\(id,\s*fields\)', 'ctx.db.patch(args.id, args.fields)', content)
    content = re.sub(r'\bctx\.db\.delete\(id\)', 'ctx.db.delete(args.id)', content)
    content = re.sub(r'\b(limit)\s*\?', 'args.limit ?', content)
    content = re.sub(r'slice\(0,\s*limit\)', 'slice(0, args.limit)', content)

    # Inject remove mutation if absent (required for wiping seed artifacts)
    if 'export const remove =' not in content:
        content += '\nexport const remove = mutation({\n  args: v.any(),\n  handler: async (ctx, args) => { await ctx.db.delete(args.id); },\n});\n'

    with open(filepath, 'w') as f:
        f.write(content)

print("Convex syntax & missing mutations patched.")
