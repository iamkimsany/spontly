import { supabase } from './supabase';
import { getEmbedding, cosineSimilarity } from './openai';

export interface MatchResult {
  matchId: string;
  format: 'solo' | 'small_group' | 'large_group';
  participantCount: number;
}

/**
 * Run after a public activity is inserted.
 * Calls the Postgres RPC which finds same-category/timeframe candidates
 * and creates a match row + participants in one atomic transaction.
 *
 * Returns the MatchResult if a match was created, null if no candidates.
 */
export async function runMatching(activityId: string): Promise<MatchResult | null> {
  console.log('[Matching] Running match_activities RPC for activity:', activityId);

  const { data, error } = await supabase.rpc('match_activities', {
    p_activity_id: activityId,
  });

  if (error) {
    console.error('[Matching] RPC error:', error.message, error.details, error.hint);
    throw error;
  }

  if (!data) {
    console.log('[Matching] No candidates found — match not created');
    return null;
  }

  const matchId = data as string;
  console.log('[Matching] Match created, id:', matchId);

  // Fetch the created match to get format + participant count
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, format')
    .eq('id', matchId)
    .maybeSingle();

  const { count: participantCount } = await supabase
    .from('match_participants')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId);

  if (matchErr || !match) {
    // RLS may block the read (match still created — just can't fetch details)
    console.warn('[Matching] Could not fetch match details:', matchErr?.message ?? 'row not visible to client');
    return { matchId, format: 'solo', participantCount: participantCount ?? 2 };
  }

  console.log('[Matching] Match details — format:', match.format, 'participants:', participantCount);

  return {
    matchId,
    format: match.format as MatchResult['format'],
    participantCount: participantCount ?? 2,
  };
}

/**
 * Optional: re-rank candidates by OpenAI embedding similarity.
 * Falls back gracefully if OPENAI_API_KEY is not set.
 * Not called by default — use when you want semantic matching beyond category.
 */
export async function rerankByEmbedding(
  queryText: string,
  candidates: Array<{ id: string; title: string; category: string }>
): Promise<typeof candidates> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.log('[Matching] No OpenAI key — skipping embedding rerank');
    return candidates;
  }
  try {
    const queryEmb = await getEmbedding(queryText);
    const scored = await Promise.all(
      candidates.map(async (c) => {
        const emb = await getEmbedding(`${c.title} ${c.category}`);
        return { ...c, score: cosineSimilarity(queryEmb, emb) };
      })
    );
    scored.sort((a, b) => b.score - a.score);
    console.log('[Matching] Embedding rerank scores:', scored.map((s) => `${s.id}:${s.score.toFixed(3)}`));
    return scored;
  } catch (e) {
    console.error('[Matching] Embedding rerank failed, returning original order:', e);
    return candidates;
  }
}
