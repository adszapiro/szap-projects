# Security Guidelines

## CRITICAL: Never Expose Secrets

Based on the Moltbook incident (Jan 2026) where an entire database including API keys was exposed publicly:

### What NOT to Commit

- `.env` files with real values
- API keys, tokens, passwords
- Database connection strings
- Private keys (JWT, SSH, etc.)
- Supabase service role keys

### Environment Variables Checklist

| Variable | Where to Store | Never Commit |
|----------|---------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env vars | URL is ok |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env vars | Key itself |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars only | NEVER in code |
| API keys (Alpaca, CoinGecko, etc.) | Vercel env vars | NEVER |

## Supabase Security

### Row Level Security (RLS)

ALWAYS enable RLS on tables:

```sql
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can only see their own data"
ON your_table FOR SELECT
USING (auth.uid() = user_id);
```

### API Key Types

| Key Type | Use Case | Expose to Client? |
|----------|----------|-------------------|
| `anon` key | Client-side operations | Yes (with RLS) |
| `service_role` key | Server-side only | NEVER |

## API Route Security

### Protect Sensitive Endpoints

```typescript
// app/api/sensitive/route.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // 1. Validate authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Use service role key only on server
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only!
  );

  // 3. Verify the user
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (error || !user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // ... proceed with authenticated request
}
```

## Before Going to Production

### Checklist

- [ ] All `.env` files are in `.gitignore`
- [ ] No hardcoded secrets in code
- [ ] RLS enabled on all Supabase tables
- [ ] API routes validate authentication
- [ ] Using `anon` key client-side, `service_role` server-side only
- [ ] Rate limiting on public APIs
- [ ] Input validation on all endpoints
- [ ] CORS properly configured

### Quick Security Audit

```bash
# Check for exposed secrets in git history
git log -p | grep -i "api_key\|secret\|password\|token" | head -50

# Check for .env files in repo
git ls-files | grep -E "\.env"

# Verify .gitignore includes security patterns
grep -E "\.env|secret|credential" .gitignore
```

## If You Accidentally Commit Secrets

1. **Immediately rotate the exposed key** in the provider's dashboard
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (coordinate with team)
4. Check logs for unauthorized access

## Vercel Environment Variables

Set secrets in Vercel dashboard, not in code:

```bash
# Add env var via CLI (interactive, won't show in history)
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Pull env vars for local development
vercel env pull .env.local
```

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
