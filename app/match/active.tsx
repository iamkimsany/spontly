import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, MapPin, MessageCircle } from 'lucide-react-native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GPSIndicator } from '@/components/ui/GPSIndicator';
import { SafetyZoneBadge } from '@/components/ui/SafetyZoneBadge';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore } from '@/store';
import { scheduleLocalNotification } from '@/lib/notifications';
import { logSafetyEvent, getChatMessages, sendChatMessage, DbChatMessage, supabase, updateMatchStatus, updateGpsActive, getMatchWithParticipants } from '@/lib/supabase';
import { getTrustLevel } from '@/lib/trustLevel';

interface ChatMsg {
  id: string;
  name: string;
  text: string;
  time: string;
  own: boolean;
}

function dbMsgToChat(
  row: DbChatMessage,
  myUserId: string,
  participants: { userId: string; name: string }[]
): ChatMsg {
  const sender = participants.find((p) => p.userId === row.user_id);
  return {
    id: row.id,
    name: sender?.name ?? 'User',
    text: row.content,
    time: new Date(row.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    own: row.user_id === myUserId,
  };
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`
    );
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return 'Seoul, Korea';
    // Pick sublocality (neighborhood) + locality (city) from address components
    const comps: { types: string[]; long_name: string }[] = data.results[0].address_components;
    const get = (...types: string[]) =>
      comps.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? '';
    const neighborhood = get('sublocality_level_2', 'sublocality_level_1', 'neighborhood');
    const district = get('sublocality_level_1', 'locality', 'administrative_area_level_2');
    const city = get('locality', 'administrative_area_level_1');
    if (neighborhood && district && neighborhood !== district) return `${neighborhood}, ${district}`;
    if (district && city && district !== city) return `${district}, ${city}`;
    return data.results[0].formatted_address?.split(',').slice(0, 2).join(',').trim() ?? 'Seoul, Korea';
  } catch {
    return 'Seoul, Korea';
  }
}

export default function ActiveMeetupScreen() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<'map' | 'chat'>('map');
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const geocodingRef = useRef(false);
  // Participants loaded fresh from DB (includes trust scores)
  const [liveParticipants, setLiveParticipants] = useState(activeMatch?.participants ?? []);
  const scrollRef = useRef<ScrollView>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const {
    activeMatch, profile, gpsActive, safetyZone, currentLocation,
    setGpsActive, setSafetyZone, setCurrentLocation, setActiveMatch,
  } = useAppStore();

  // GPS tracking
  useEffect(() => {
    startTracking();
    const timer = setInterval(() => setElapsed((e) => e + 1), 60000);
    return () => {
      stopTracking();
      clearInterval(timer);
    };
  }, []);

  // Load chat history + subscribe to new messages
  useEffect(() => {
    if (!activeMatch?.id) return;
    const matchId = activeMatch.id;

    const participants = activeMatch.participants;
    const myId = profile?.id ?? '';

    getChatMessages(matchId).then((rows) => {
      setMessages(rows.map((r) => dbMsgToChat(r, myId, participants)));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }).catch((e: any) => console.warn('[Chat] load error:', e?.message));

    const channel = supabase
      .channel(`chat-${matchId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `match_id=eq.${matchId}` },
        (payload: any) => {
          const row = payload.new as DbChatMessage;
          if (row.user_id === myId) return; // already added optimistically
          setMessages((prev) => [...prev, dbMsgToChat(row, myId, participants)]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] chat channel status:', status);
      });

    chatChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [activeMatch?.id]);

  // Watch for match completion — redirects user 2 when user 1 ends the meetup
  useEffect(() => {
    if (!activeMatch?.id) return;
    const matchId = activeMatch.id;

    const handleCompleted = () => {
      stopTracking();
      router.replace('/match/rating');
    };

    // WebSocket subscription on match status changes
    const statusChannel = supabase
      .channel(`match-status-${matchId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload: any) => {
          if (payload.new?.status === 'completed') handleCompleted();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] match-status channel status:', status);
      });

    // Polling fallback every 5 seconds
    const poll = async () => {
      try {
        const { data } = await supabase
          .from('matches')
          .select('status')
          .eq('id', matchId)
          .single();
        if (data?.status === 'completed') handleCompleted();
      } catch (e: any) {
        console.warn('[ActiveMeetup] status poll error:', e?.message);
      }
    };
    const pollInterval = setInterval(poll, 5000);

    return () => {
      supabase.removeChannel(statusChannel);
      clearInterval(pollInterval);
    };
  }, [activeMatch?.id]);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setGpsActive(true);
    const { activeMatch: match, profile: p } = useAppStore.getState();
    if (match?.id && p?.id) {
      updateGpsActive(match.id, p.id, true).catch((e: any) =>
        console.warn('[GPS] updateGpsActive error:', e?.message)
      );
    }
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 20 },
      (loc) => {
        setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        checkSafetyZone(loc.coords.latitude, loc.coords.longitude);
      }
    );
  };

  const stopTracking = () => {
    locationSub.current?.remove();
    setGpsActive(false);
    const { activeMatch: match, profile: p } = useAppStore.getState();
    if (match?.id && p?.id) {
      updateGpsActive(match.id, p.id, false).catch(() => {});
    }
  };

  // Reload participants from DB on mount so trust scores are fresh
  useEffect(() => {
    if (!activeMatch?.id) return;
    getMatchWithParticipants(activeMatch.id)
      .then((raw) => {
        if (!raw) return;
        const mapped = ((raw.match_participants as any[]) ?? []).map((p: any) => ({
          userId: p.user_id,
          name: p.users?.name ?? 'User',
          photoUrl: p.users?.photo_url ?? null,
          confirmed: p.confirmed,
          gpsActive: p.gps_active,
          trustScore: p.users?.trust_score ?? 40,
        }));
        setLiveParticipants(mapped);
      })
      .catch((e: any) => console.warn('[ActiveMeetup] participants reload error:', e?.message));
  }, [activeMatch?.id]);

  // Reverse geocode whenever location updates (debounced — only first time or every 200m)
  useEffect(() => {
    if (!currentLocation || geocodingRef.current) return;
    geocodingRef.current = true;
    reverseGeocode(currentLocation.latitude, currentLocation.longitude).then((label) => {
      setLocationLabel(label);
      // Allow re-geocoding after 60 s to pick up movement
      setTimeout(() => { geocodingRef.current = false; }, 60000);
    });
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const checkSafetyZone = useCallback(
    (lat: number, lng: number) => {
      // Simplified: all good for demo. In production compare to meetup location + chat location.
      setSafetyZone('green');
    },
    [setSafetyZone]
  );

  const handleSOS = async () => {
    setSafetyZone('sos');
    if (activeMatch) {
      logSafetyEvent({
        match_id: activeMatch.id,
        user_id: profile?.id ?? '',
        zone: 'sos',
        gps_lat: currentLocation?.latitude,
        gps_lng: currentLocation?.longitude,
      }).catch(() => {});
    }
  };

  const handleCompleteActivity = async () => {
    console.log('[ActiveMeetup] End meetup pressed');
    stopTracking();
    if (activeMatch?.id) {
      try {
        await updateMatchStatus(activeMatch.id, 'completed');
      } catch (e: any) {
        console.warn('[ActiveMeetup] Could not update match status:', e?.message);
      }
    }
    router.replace('/match/rating');
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !activeMatch?.id || !profile?.id) return;
    setInputText('');

    // Optimistic update
    const optimistic: ChatMsg = {
      id: `opt-${Date.now()}`,
      name: profile.name ?? 'You',
      text,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      own: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await sendChatMessage(activeMatch.id, profile.id, text);
    } catch (e: any) {
      console.warn('[Chat] send error:', e?.message);
    }
  };

  const formatElapsed = () => {
    const h = Math.floor(elapsed / 60);
    const m = elapsed % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <GlassCard variant="regular" padding={{ vertical: 14, horizontal: 20 }} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>{activeMatch?.activityTitle ?? 'Active Meetup'}</Text>
              <Text style={styles.headerSub}>Started {formatElapsed()} ago</Text>
            </View>
            <View style={styles.headerRight}>
              <SafetyZoneBadge zone={safetyZone} />
              <GPSIndicator status={gpsActive ? 'active' : 'off'} />
            </View>
          </View>
        </GlassCard>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['map', 'chat'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <View style={styles.tabInner}>
                {tab === 'map'
                  ? <MapPin size={14} color={activeTab === tab ? Colors.accent : Colors.text.secondary} strokeWidth={2} />
                  : <MessageCircle size={14} color={activeTab === tab ? Colors.accent : Colors.text.secondary} strokeWidth={2} />
                }
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'map' ? 'Map & Safety' : 'Group Chat'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'map' ? (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.mapContent} showsVerticalScrollIndicator={false}>
              {/* Map placeholder */}
              <GlassCard variant="strong" padding={0} style={styles.mapCard}>
                <View style={styles.mapPlaceholder}>
                  <MapPin size={40} color={Colors.accent} strokeWidth={1.6} />
                  <View style={styles.mapLabelRow}>
                    <MapPin size={14} color={Colors.accent} strokeWidth={2} />
                    <Text style={styles.mapText}>
                      {currentLocation
                        ? (locationLabel ?? 'Finding your location…')
                        : 'Finding your location…'}
                    </Text>
                  </View>
                  {activeMatch?.location ? (
                    <Text style={styles.mapSub}>{activeMatch.location}</Text>
                  ) : null}
                </View>
              </GlassCard>

              {/* Participants */}
              <GlassCard variant="regular" padding={18} style={styles.participantsCard}>
                <Text style={styles.sectionLabel}>In this meetup</Text>
                {liveParticipants
                  .filter((p) => p.userId !== profile?.id)
                  .map((p) => {
                    const level = getTrustLevel(p.trustScore);
                    return (
                      <View key={p.userId} style={styles.participantRow}>
                        <View style={styles.participantAvatar}>
                          <Text style={styles.participantInitial}>{p.name[0]}</Text>
                        </View>
                        <View style={styles.participantInfo}>
                          <Text style={styles.participantName}>{p.name}</Text>
                          <View style={styles.participantMeta}>
                            <View style={[styles.trustBadge, { backgroundColor: level.bg, borderColor: level.border }]}>
                              <Text style={[styles.trustBadgeText, { color: level.color }]}>
                                {level.name} · {p.trustScore}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <GPSIndicator status={p.gpsActive ? 'active' : 'off'} />
                      </View>
                    );
                  })}
                {liveParticipants.filter((p) => p.userId !== profile?.id).length === 0 && (
                  <Text style={styles.noParticipants}>Waiting for others to join…</Text>
                )}
              </GlassCard>

              {/* Safety zones legend */}
              <GlassCard variant="subtle" padding={16} style={styles.legendCard}>
                <Text style={styles.sectionLabel}>Safety status</Text>
                <View style={styles.zones}>
                  {(['green', 'yellow', 'red'] as const).map((z) => (
                    <SafetyZoneBadge key={z} zone={z} />
                  ))}
                </View>
              </GlassCard>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Fixed bottom bar — outside ScrollView so touches are never intercepted */}
            <View style={styles.actions}>
              <PrimaryButton
                label="End Meetup"
                iconAfter={<Check size={16} color="#ffffff" strokeWidth={2.5} />}
                onPress={handleCompleteActivity}
                fullWidth
              />
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={90}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => (
                <View key={msg.id} style={[styles.bubble, msg.own ? styles.bubbleOwn : styles.bubbleOther]}>
                  {!msg.own && <Text style={styles.bubbleName}>{msg.name}</Text>}
                  <Text style={[styles.bubbleText, msg.own && styles.bubbleTextOwn]}>{msg.text}</Text>
                  <Text style={styles.bubbleTime}>{msg.time}</Text>
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.inputRow}>
              <GlassCard variant="regular" padding={0} style={styles.inputCard}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Message..."
                  placeholderTextColor={Colors.text.tertiary}
                  style={styles.chatInput}
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                />
              </GlassCard>
              <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}


      </View>
      </SafeAreaView>

    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.accent },
  header: { marginHorizontal: 16, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary },
  headerSub: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.glass.subtle,
    borderWidth: 1, borderColor: Colors.border.subtle,
    alignItems: 'center', justifyContent: 'center',
  },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.border.accent },
  tabText: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary },
  tabTextActive: { color: Colors.accent },
  mapContent: { paddingHorizontal: 16, gap: 12 },
  mapCard: { width: '100%', borderRadius: 20 },
  mapPlaceholder: {
    height: 220, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.glass.strong, borderRadius: 20, gap: 8,
  },
  mapLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapText: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  mapSub: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.secondary },
  participantsCard: { width: '100%' },
  sectionLabel: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary, marginBottom: 12 },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  participantAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glass.regular,
    borderWidth: 1, borderColor: Colors.border.regular,
    alignItems: 'center', justifyContent: 'center',
  },
  participantInitial: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  participantInfo: { flex: 1, gap: 4 },
  participantName: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  participantMeta: { flexDirection: 'row' },
  trustBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 9999, borderWidth: 1,
  },
  trustBadgeText: { fontFamily: Fonts.bodyMedium, fontSize: 11 },
  noParticipants: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary },
  legendCard: { width: '100%', borderRadius: 16 },
  zones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  chatContent: { paddingHorizontal: 16, paddingTop: 12 },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: Colors.glass.regular,
    borderWidth: 1,
    borderColor: Colors.border.regular,
    alignSelf: 'flex-start',
  },
  bubbleOther: {},
  bubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.border.accent,
  },
  bubbleName: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.xs, color: Colors.accent, marginBottom: 3 },
  bubbleText: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.primary },
  bubbleTextOwn: { color: Colors.text.dark },
  bubbleTime: { fontFamily: Fonts.body, fontSize: 10, color: Colors.text.tertiary, marginTop: 4, textAlign: 'right' },
  inputRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, alignItems: 'center' },
  inputCard: { flex: 1 },
  chatInput: {
    backgroundColor: Colors.glass.regular,
    borderWidth: 1, borderColor: Colors.border.regular,
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16,
    fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.primary,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { fontSize: 16, color: Colors.text.dark },
});
