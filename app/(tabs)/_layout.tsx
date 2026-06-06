import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import { Home, List, Bell, User } from 'lucide-react-native';
import { Fonts, FontSize } from '@/constants/typography';

const ACTIVE_COLOR = '#2563EB';
const INACTIVE_COLOR = 'rgba(0,0,0,0.35)';

function TabIcon({
  Icon,
  label,
  focused,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  label: string;
  focused: boolean;
}) {
  const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />
      </View>
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
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={List} label="My List" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Bell} label="Alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255,255,255,0.85)',
    // Native shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    // Android elevation
    elevation: 12,
    height: 84,
    paddingBottom: 16,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
  },
  iconPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  iconPillActive: {
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  tabLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: INACTIVE_COLOR,
  },
  tabLabelActive: {
    color: ACTIVE_COLOR,
    fontFamily: Fonts.bodyMedium,
  },
});
