CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON chat_messages(match_id);
CREATE INDEX ON chat_messages(created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM match_participants
    WHERE match_id = chat_messages.match_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM match_participants
    WHERE match_id = chat_messages.match_id
    AND user_id = auth.uid()
  )
);

alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table match_participants;
