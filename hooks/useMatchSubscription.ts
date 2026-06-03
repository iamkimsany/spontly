import { useEffect, useRef } from 'react';
import { supabase, loadActiveMatchForUser } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { scheduleLocalNotification } from '@/lib/notifications';

export function useMatchSubscription() {
  const { profile, setActiveMatch } = useAppStore();
  const prevMatchId = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const userId = profile.id;
    // Unique name prevents StrictMode double-mount from reusing a subscribed channel
    const channelName = `match-notify-${userId}-${Date.now()}`;

    const notify = async () => {
      try {
        const match = await loadActiveMatchForUser(userId);
        if (match && match.id !== prevMatchId.current) {
          const isNew = prevMatchId.current !== null;
          prevMatchId.current = match.id;
          setActiveMatch(match);
          if (isNew) {
            scheduleLocalNotification(
              '🔥 Match found!',
              `Someone nearby wants to: ${match.activityTitle}. Tap to view.`
            );
          }
        }
      } catch (e: any) {
        console.warn('[useMatchSubscription] error:', e?.message);
      }
    };

    notify();
    const interval = setInterval(notify, 5000);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_participants' },
        async (payload: any) => {
          if (payload.new?.user_id !== userId) return;
          notify();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] match-notify channel status:', status);
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);
}
