# Supabase Deployment Checklist

## 1. Run schema (first time only)
Paste and run `schema.sql` in the Supabase SQL Editor.

## 2. Deploy matching function (run after schema)
Paste and run `match_activities.sql` in the Supabase SQL Editor.

## 3. Enable Anonymous Auth
Authentication → Providers → Anonymous → toggle ON

## 4. Verify the function works manually
In SQL Editor:
```sql
-- Check it exists
select proname, prosrc from pg_proc where proname = 'match_activities';

-- Test it (use a real activity id from your activities table)
select match_activities('your-activity-uuid-here');

-- Check results
select * from matches order by created_at desc limit 5;
select * from match_participants limit 20;
```

## 5. Debug matching logs
When a user adds a public activity, the app logs:
- `[AddActivity] Inserting into Supabase: {...}`  — the exact payload sent
- `[AddActivity] Insert SUCCESS — id: <uuid>`     — confirms DB write
- `[AddActivity] Matching: MATCH CREATED — {...}` — match found
- `[AddActivity] Matching: no match found yet`    — no candidates yet

Check the browser/device console for these lines.
