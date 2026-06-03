import { Redirect } from 'expo-router';
import { useAppStore } from '@/store';

export default function Index() {
  const { isAuthenticated, onboardingComplete } = useAppStore();

  if (!onboardingComplete) return <Redirect href="/onboarding" />;
  if (!isAuthenticated) return <Redirect href="/auth/phone" />;
  return <Redirect href="/(tabs)" />;
}
