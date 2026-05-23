import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import Toast, { BaseToast, ErrorToast, type BaseToastProps } from 'react-native-toast-message';
import { AnimatedSplash } from '@/components/AnimatedSplash';


Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  enabled: !__DEV__,
});

const toastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#F97316', backgroundColor: '#181613', borderRadius: 10, height: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}
      text1Style={{ color: '#f5efe6', fontSize: 14, fontWeight: '600' }}
      text2Style={{ color: 'rgba(245,239,230,0.55)' }}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#FF4444', backgroundColor: '#181613', borderRadius: 10, height: 52, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}
      text1Style={{ color: '#f5efe6', fontSize: 14, fontWeight: '600' }}
      text2Style={{ color: 'rgba(245,239,230,0.55)' }}
    />
  ),
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

function AppContent() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  useEffect(() => { restoreSession(); }, []);
  usePushNotifications();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0c0b0a' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#0c0b0a' },
          headerTintColor: '#f5efe6',
          headerTitle: '',
          headerBackTitle: 'Wróć',
          contentStyle: { backgroundColor: '#0c0b0a' },
        }}
      />
      <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen
        name="profile/edit"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: '#0c0b0a' },
          headerTintColor: '#f5efe6',
          headerTitle: 'Edytuj profil',
          headerBackTitle: 'Wróć',
          contentStyle: { backgroundColor: '#0c0b0a' },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  function handleSplashDone() {
    setSplashDone(true);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <AppContent />
        <Toast config={toastConfig} bottomOffset={90} />
        {!splashDone && <AnimatedSplash onDone={handleSplashDone} />}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
