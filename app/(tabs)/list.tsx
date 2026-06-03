import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';
import { useAppStore, Activity } from '@/store';
import { AddActivitySheet } from '@/components/AddActivitySheet';
import { CATEGORIES } from '@/constants/categories';

export default function ListScreen() {
  const { activities, removeActivity, activeMatch } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);

  const grouped = {
    today: activities.filter((a) => a.timeframe === 'today'),
    this_week: activities.filter((a) => a.timeframe === 'this_week'),
    someday: activities.filter((a) => a.timeframe === 'someday'),
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove activity?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeActivity(id) },
    ]);
  };

  const renderGroup = (label: string, items: Activity[]) => {
    if (items.length === 0) return null;
    return (
      <View key={label} style={styles.group}>
        <Text style={styles.groupLabel}>{label}</Text>
        {items.map((a) => {
          const cat = CATEGORIES.find((c) => c.id === a.category);
          return (
            <GlassCard key={a.id} variant={a.isPublic ? 'active' : 'regular'} padding={{ vertical: 16, horizontal: 18 }} style={styles.item}>
              <View style={styles.itemRow}>
                <Text style={styles.itemEmoji}>{cat?.emoji ?? '📌'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{a.title}</Text>
                  <Text style={styles.itemCat}>{cat?.label}</Text>
                </View>
                <View style={styles.itemRight}>
                  {a.isPublic && (() => {
                    const isMatched = activeMatch?.activityId === a.id;
                    const isCompleted = isMatched && activeMatch?.status === 'completed';
                    const isActive = isMatched && (activeMatch?.status === 'pending' || activeMatch?.status === 'confirmed');
                    if (isCompleted) return (
                      <View style={[styles.publicPill, styles.completedPill]}>
                        <Text style={[styles.publicText, styles.completedText]}>Completed ✓</Text>
                      </View>
                    );
                    if (isActive) return (
                      <View style={[styles.publicPill, styles.matchedPill]}>
                        <Text style={[styles.publicText, styles.matchedText]}>Matched 🔥</Text>
                      </View>
                    );
                    return (
                      <View style={styles.publicPill}>
                        <Text style={styles.publicText}>Seeking match</Text>
                      </View>
                    );
                  })()}
                  <TouchableOpacity onPress={() => handleDelete(a.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          );
        })}
      </View>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>My Activities</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {activities.length === 0 ? (
            <GlassCard variant="strong" padding={40} style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Your list is empty</Text>
              <Text style={styles.emptySub}>Add activities you want to do and let Spontly find you company.</Text>
              <PrimaryButton label="Add first activity" onPress={() => setShowAdd(true)} style={{ marginTop: 20 }} />
            </GlassCard>
          ) : (
            <>
              {renderGroup('Today', grouped.today)}
              {renderGroup('This Week', grouped.this_week)}
              {renderGroup('Someday', grouped.someday)}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        <AddActivitySheet visible={showAdd} onClose={() => setShowAdd(false)} />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  pageTitle: { fontFamily: Fonts.display, fontSize: FontSize.lg, color: Colors.text.primary },
  addBtn: { backgroundColor: Colors.accentSoft, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 9999, borderWidth: 1, borderColor: Colors.border.accent },
  addBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.sm, color: Colors.accent },
  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  group: { marginBottom: 8 },
  groupLabel: { fontFamily: Fonts.displayMedium, fontSize: FontSize.sm, color: Colors.text.tertiary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  item: { width: '100%', marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemEmoji: { fontSize: 24, width: 36 },
  itemTitle: { fontFamily: Fonts.bodyMedium, fontSize: FontSize.base, color: Colors.text.primary },
  itemCat: { fontFamily: Fonts.body, fontSize: FontSize.sm, color: Colors.text.tertiary, marginTop: 2 },
  itemRight: { gap: 6, alignItems: 'flex-end' },
  publicPill: { backgroundColor: Colors.accentSoft, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999, borderWidth: 1, borderColor: Colors.border.accent },
  publicText: { fontFamily: Fonts.bodyMedium, fontSize: 10, color: Colors.accent },
  completedPill: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)' },
  completedText: { color: '#4ade80' },
  matchedPill: { backgroundColor: 'rgba(251,146,60,0.15)', borderColor: 'rgba(251,146,60,0.4)' },
  matchedText: { color: '#fb923c' },
  deleteBtn: { padding: 4 },
  deleteIcon: { color: Colors.text.tertiary, fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontFamily: Fonts.display, fontSize: FontSize.md, color: Colors.text.primary, marginBottom: 8 },
  emptySub: { fontFamily: Fonts.body, fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22 },
});
