-- ============================================================
-- match_activities(p_activity_id uuid)
--
-- Called immediately after a public activity is inserted.
-- Finds other users' public activities with the same category
-- and timeframe, then creates a match + participants rows.
--
-- Returns the new match id, or NULL if no candidates found.
-- ============================================================

create or replace function match_activities(p_activity_id uuid)
returns uuid
language plpgsql
security definer  -- runs as DB owner so it can bypass per-row RLS on matches
as $$
declare
  v_user_id    uuid;
  v_category   varchar;
  v_timeframe  timeframe_type;
  v_match_id   uuid;
  v_format     match_format;
  v_candidate  record;
  v_count      int := 0;
  v_candidates uuid[] := '{}';
begin
  -- 1. Load the triggering activity
  select user_id, category, timeframe
    into v_user_id, v_category, v_timeframe
    from activities
   where id = p_activity_id
     and is_public = true;

  if not found then
    raise notice 'match_activities: activity % not found or not public', p_activity_id;
    return null;
  end if;

  raise notice 'match_activities: looking for category=% timeframe=% excluding user=%',
    v_category, v_timeframe, v_user_id;

  -- 2. Collect candidate activity owners (different user, same category + timeframe,
  --    not expired, not already in a confirmed/pending match together)
  for v_candidate in
    select a.id as activity_id, a.user_id
      from activities a
     where a.is_public    = true
       and a.category     = v_category
       and a.timeframe    = v_timeframe
       and a.user_id     != v_user_id
       and a.expires_at   > now()
       and a.id           != p_activity_id
       -- exclude users already matched with this user in an active match
       and a.user_id not in (
         select mp.user_id
           from match_participants mp
           join matches m on m.id = mp.match_id
          where m.status in ('pending', 'confirmed')
            and mp.match_id in (
              select match_id from match_participants where user_id = v_user_id
            )
       )
  loop
    v_candidates := array_append(v_candidates, v_candidate.user_id);
    v_count := v_count + 1;
  end loop;

  raise notice 'match_activities: found % candidate(s)', v_count;

  if v_count = 0 then
    return null;
  end if;

  -- 3. Determine format based on group size (including the initiating user)
  if v_count = 1 then
    v_format := 'solo';
  elsif v_count <= 4 then
    v_format := 'small_group';
  else
    v_format := 'large_group';
  end if;

  -- 4. Create the match row
  insert into matches (activity_id, format, status)
  values (p_activity_id, v_format, 'pending')
  returning id into v_match_id;

  raise notice 'match_activities: created match % (format=%)', v_match_id, v_format;

  -- 5. Add the initiating user as first participant
  insert into match_participants (match_id, user_id)
  values (v_match_id, v_user_id)
  on conflict do nothing;

  -- 6. Add each matched user as a participant
  for v_candidate in
    select a.user_id
      from activities a
     where a.is_public    = true
       and a.category     = v_category
       and a.timeframe    = v_timeframe
       and a.user_id     != v_user_id
       and a.expires_at   > now()
       and a.id           != p_activity_id
  loop
    insert into match_participants (match_id, user_id)
    values (v_match_id, v_candidate.user_id)
    on conflict do nothing;
  end loop;

  return v_match_id;
end;
$$;

-- Grant execute to the authenticated + anon roles (anon for RLS-bypassed inserts)
grant execute on function match_activities(uuid) to authenticated, anon;
