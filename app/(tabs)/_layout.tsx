import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="My List" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" label="Alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: Colors.border.regular,
    backgroundColor: 'transparent',
    height: 80,
    paddingBottom: 12,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 22,
  },
  tabLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },
  tabLabelActive: {
    color: Colors.accent,
  },
});
