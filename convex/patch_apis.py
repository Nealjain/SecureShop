import glob
import re
import os

files = glob.glob("/Users/nealmanawat/Developer/E /secure-ecommerce/convex/convex/*.ts")

for filepath in files:
    filename = os.path.basename(filepath)
    if filename in ("schema.ts", "seed.ts", "_generated", "tsconfig.json"):
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    # Loosen mutation/query args to v.any() when doing full ciphertexts
    # Because types are dynamic now.
    content = re.sub(r'args:\s*\{[^\}]+\}', 'args: v.any()', content)

    # Re-map exact queries to their blind index equivalents for safe searching
    content = content.replace('q.eq("email", args.email)', 'q.eq("email_hash", args.email_hash)')
    content = content.replace('q.eq("token", args.token)', 'q.eq("token_hash", args.token_hash)')
    content = content.replace('.withIndex("by_email"', '.withIndex("by_email_hash"')
    content = content.replace('.withIndex("by_token"', '.withIndex("by_token_hash"')

    # Replace destructured args where they are explicitly defined to just use args object
    # e.g., handler: async (ctx, { email }) =>
    content = re.sub(r'handler:\s*async\s*\(ctx,\s*\{[^\}]+\}\)', 'handler: async (ctx, args)', content)

    with open(filepath, 'w') as f:
        f.write(content)

print("Patched Convex APIs for FLE payloads.")
