# CLAUDE.md

@AGENTS.md

## Environment Variables

```env
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...        # optional — falls back to mock scoring without it
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000   # default
```
