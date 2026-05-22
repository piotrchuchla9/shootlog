import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    registerForPushNotifications();
  }, [user?.id]);
}

async function registerForPushNotifications() {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await api.post('/user/push-token', { token: tokenData.data });
  } catch (err) {
    console.warn('[push] token registration failed:', err);
  }
}
