-- Add meeting_type and max_group_size columns to activities table
alter table activities
  add column if not exists meeting_type text not null default 'solo'
    check (meeting_type in ('solo', 'group')),
  add column if not exists max_group_size int null;
