import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppStore } from '@/store';
// Firebase initializes at module import time (both modular + compat SDKs)
import '@/lib/firebase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, onboardingComplete } = useAppStore();

  const [loaded] = useFonts({
    'ClashDisplay-Bold': require('../assets/fonts/ClashDisplay-Bold.otf'),
    'ClashDisplay-Medium': require('../assets/fonts/ClashDisplay-Medium.otf'),
    'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('../assets/fonts/DMSans-SemiBold.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="auth/phone" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="auth/profile-setup" />
        <Stack.Screen name="auth/trusted-contact" />
        <Stack.Screen name="auth/gps-consent" />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="match/found" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="match/confirm" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="match/active" />
        <Stack.Screen name="match/rating" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
