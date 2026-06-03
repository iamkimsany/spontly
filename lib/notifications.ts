import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function scheduleLocalNotification(title: string, body: string) {
  if (Platform.OS === 'web') {
    console.log('[Notification]', title, body);
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export function sendSOSNotificationToTrustedContact(
  contactPhone: string,
  userName: string,
  location: { latitude: number; longitude: number } | null
) {
  // In production this would send via Firebase + backend to trusted contact's device.
  // For MVP: schedule a local notification confirming SOS was triggered.
  const locationStr = location
    ? `Location: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
    : 'Location unavailable';
  scheduleLocalNotification(
    '🆘 SOS Alert Sent',
    `Emergency alert sent to ${contactPhone}. ${locationStr}`
  );
}
