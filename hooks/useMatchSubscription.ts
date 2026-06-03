import { useEffect, useRef } from 'react';
import { supabase, loadActiveMatchForUser } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { scheduleLocalNotification } from '@/lib/notifications';

export function useMatchSubscription() {
  const { profile, setActiveMatch } = useAppStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const prevMatchId = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const userId = profile.id;

    // Poll every 5 seconds — fallback for when WebSocket is unreliable on mobile browsers
    const poll = async () => {
      try {
        const match = await loadActiveMatchForUser(userId);
        if (match) {
          if (match.id !== prevMatchId.current) {
            prevMatchId.current = match.id;
            setActiveMatch(match);
            if (prevMatchId.current !== null) {
              scheduleLocalNotification(
                '🔥 Match found!',
                `Someone nearby wants to: ${match.activityTitle}. Tap to view.`
              );
            }
          }
        }
      } catch (e: any) {
        console.warn('[useMatchSubscription] Poll error:', e?.message);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);

    // WebSocket subscription — fires immediately when available
    const channel = supabase
      .channel(`match-notify-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_participants' },
        async (payload: any) => {
          if (payload.new?.user_id !== userId) return;
          try {
            const match = await loadActiveMatchForUser(userId);
            if (match) {
              prevMatchId.current = match.id;
              setActiveMatch(match);
              scheduleLocalNotification(
                '🔥 Match found!',
                `Someone nearby wants to: ${match.activityTitle}. Tap to view.`
              );
            }
          } catch (e: any) {
            console.warn('[useMatchSubscription] WebSocket handler error:', e?.message);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] match-notify channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [profile?.id]);
}
