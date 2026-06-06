import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import { Home, List, Bell, User } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Fonts, FontSize } from '@/constants/typography';

const ACTIVE_COLOR = '#2563EB';
const INACTIVE_COLOR = 'rgba(255,255,255,0.4)';

function TabIcon({
  Icon,
  label,
  focused,
}: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  focused: boolean;
}) {
  const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <View style={styles.tabItem}>
      <Icon size={24} color={color} />
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
    borderTopColor: Colors.border.regular,
    backgroundColor: 'transparent',
    height: 80,
    paddingBottom: 12,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
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
