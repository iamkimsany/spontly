import { useEffect, useRef } from 'react';
import { supabase, loadActiveMatchForUser } from '@/lib/supabase';
import { useAppStore } from '@/store';
import { scheduleLocalNotification } from '@/lib/notifications';

export function useMatchSubscription() {
  const { profile, setActiveMatch } = useAppStore();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const userId = profile.id;

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
              setActiveMatch(match);
              scheduleLocalNotification(
                '🔥 Match found!',
                `Someone nearby wants to: ${match.activityTitle}. Tap to view.`
              );
            }
          } catch (e: any) {
            console.warn('[useMatchSubscription] Failed to load match:', e?.message);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] match-notify channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id]);
}
