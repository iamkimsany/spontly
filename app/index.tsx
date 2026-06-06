import { Redirect } from 'expo-router';
import { useAppStore } from '@/store';

export default function Index() {
  const { isAuthenticated } = useAppStore();

  if (!isAuthenticated) return <Redirect href="/auth/phone" />;
  return <Redirect href="/(tabs)" />;
}
