import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GPSIndicator } from '@/components/ui/GPSIndicator';
import { SafetyZoneBadge } from '@/components/ui/SafetyZoneBadge';
import { SOSButton } from '@/components/ui/SOSButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore, SafetyZone } from '@/store';
import { scheduleLocalNotification, sendSOSNotificationToTrustedContact } from '@/lib/notifications';
import { logSafetyEvent, getChatMessages, sendChatMessage, DbChatMessage, supabase, updateMatchStatus } from '@/lib/supabase';

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

export default function ActiveMeetupScreen() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [showSOSAlert, setShowSOSAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'chat'>('map');
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
      .channel(`chat-${matchId}`)
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
    return () => { channel.unsubscribe(); };
  }, [activeMatch?.id]);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setGpsActive(true);
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
  };

  const checkSafetyZone = useCallback(
    (lat: number, lng: number) => {
      // Simplified: all good for demo. In production compare to meetup location + chat location.
      setSafetyZone('green');
    },
    [setSafetyZone]
  );

  const handleSOS = async () => {
    setSafetyZone('sos');
    setShowSOSAlert(true);
    // Send alert to trusted contact (notification only — no real calls)
    sendSOSNotificationToTrustedContact(
      profile?.trustedContact ?? 'your trusted contact',
      profile?.name ?? 'User',
      currentLocation
    );
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
      <View style={styles.container}>
        {/* Header */}
        <GlassCard variant="regular" padding={{ vertical: 14, horizontal: 20 }} style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>{activeMatch?.activityTitle ?? 'Active Meetup'}</Text>
              <Text style={styles.headerSub}>Started {formatElapsed()} ago</Text>
            </View>
            <View style={styles.headerRight}>
              <SafetyZoneBadge zone={safetyZone} />
              <GPSIndicator active={gpsActive} />
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
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'map' ? '📍 Map & Safety' : '💬 Group Chat'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'map' ? (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.mapContent} showsVerticalScrollIndicator={false}>
              {/* Map placeholder */}
              <GlassCard variant="strong" padding={0} style={styles.mapCard}>
                <View style={styles.mapPlaceholder}>
                  <Text style={styles.mapIcon}>🗺️</Text>
                  <Text style={styles.mapText}>
                    {currentLocation
                      ? `📍 ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                      : 'Getting location...'}
                  </Text>
                  <Text style={styles.mapSub}>{activeMatch?.location}</Text>
                </View>
              </GlassCard>

              {/* Participants */}
              <GlassCard variant="regular" padding={18} style={styles.participantsCard}>
                <Text style={styles.sectionLabel}>In this meetup</Text>
                {activeMatch?.participants.map((p) => (
                  <View key={p.userId} style={styles.participantRow}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantInitial}>{p.name[0]}</Text>
                    </View>
                    <Text style={styles.participantName}>{p.name}</Text>
                    <View style={styles.participantStatus}>
                      <GPSIndicator active={p.gpsActive} />
                    </View>
                  </View>
                ))}
              </GlassCard>

              {/* Safety zones legend */}
              <GlassCard variant="subtle" padding={16} style={styles.legendCard}>
                <Text style={styles.sectionLabel}>Safety status</Text>
                <View style={styles.zones}>
                  {(['green', 'yellow', 'red', 'black'] as SafetyZone[]).map((z) => (
                    <SafetyZoneBadge key={z} zone={z} />
                  ))}
                </View>
              </GlassCard>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Fixed bottom bar — outside ScrollView so touches are never intercepted */}
            <View style={styles.actions}>
              <PrimaryButton
                label="End Meetup ✓"
                onPress={handleCompleteActivity}
                style={{ flex: 1 }}
              />
              <SOSButton onSOS={handleSOS} />
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

      {/* SOS Alert Modal — no real calls, in-app only */}
      <Modal visible={showSOSAlert} transparent animationType="fade">
        <View style={styles.sosOverlay}>
          <GlassCard variant="strong" padding={32} style={styles.sosModal}>
            <Text style={styles.sosIcon}>🆘</Text>
            <Text style={styles.sosTitle}>SOS Triggered</Text>
            <Text style={styles.sosSub}>
              An emergency alert has been sent to your trusted contact with your current location.
              Stay where you are if it is safe to do so.
            </Text>
            <GlassCard variant="subtle" padding={14} style={styles.sosContact}>
              <Text style={styles.sosContactLabel}>Alert sent to:</Text>
              <Text style={styles.sosContactValue}>{profile?.trustedContact ?? 'Trusted contact'}</Text>
              {currentLocation && (
                <Text style={styles.sosLocation}>
                  📍 {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
                </Text>
              )}
            </GlassCard>
            <Text style={styles.sosNote}>
              ⚠️ Call emergency services (112) yourself if you are in immediate danger.
            </Text>
            <TouchableOpacity
              onPress={() => setShowSOSAlert(false)}
              style={styles.sosDismiss}
            >
              <Text style={styles.sosDismissText}>I am safe — Dismiss</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
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
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.border.accent },
  tabText: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary },
  tabTextActive: { color: Colors.accent },
  mapContent: { paddingHorizontal: 16, gap: 12 },
  mapCard: { width: '100%', borderRadius: 20 },
  mapPlaceholder: {
    height: 220, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.glass.strong, borderRadius: 20, gap: 8,
  },
  mapIcon: { fontSize: 48 },
  mapText: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.accent },
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
  participantName: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary, flex: 1 },
  participantStatus: {},
  legendCard: { width: '100%', borderRadius: 16 },
  zones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
    alignItems: 'center',
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
  sosOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', paddingHorizontal: 24 },
  sosModal: { width: '100%', alignItems: 'center' },
  sosIcon: { fontSize: 64, marginBottom: 8 },
  sosTitle: { fontFamily: Fonts.display, fontSize: FontSize.xl, color: Colors.sos, marginBottom: 12 },
  sosSub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.primary, textAlign: 'center', lineHeight: 24, marginBottom: 16 },
  sosContact: { width: '100%', borderRadius: 14 },
  sosContactLabel: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.secondary },
  sosContactValue: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.md, color: Colors.text.primary, marginTop: 4 },
  sosLocation: { fontFamily: Fonts.body, fontSize: FontSize.xs, color: Colors.text.tertiary, marginTop: 6 },
  sosNote: {
    fontFamily: Fonts.bodyMedium, fontSize: FontSize.sm, color: Colors.warning,
    textAlign: 'center', marginTop: 16, marginBottom: 8, lineHeight: 20,
  },
  sosDismiss: {
    backgroundColor: Colors.glass.regular,
    borderRadius: 9999, paddingVertical: 14, paddingHorizontal: 28,
    borderWidth: 1, borderColor: Colors.border.regular,
    marginTop: 8,
  },
  sosDismissText: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
});
