import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState, useEffect } from 'react';
import { signInWithApple, signInWithGoogle } from '@/lib/socialAuth';

export default function LoginScreen() {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  async function handleGoogle() {
    setLoading('google');
    try {
      await signInWithGoogle();
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      if (e?.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Błąd logowania', e?.message ?? 'Spróbuj ponownie');
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleApple() {
    setLoading('apple');
    try {
      await signInWithApple();
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Błąd logowania', e?.message ?? 'Spróbuj ponownie');
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.hero}>
          <Text style={styles.logo}>🎯</Text>
          <Text style={styles.appName}>ShootLog</Text>
          <Text style={styles.tagline}>Twój dziennik zawodów strzeleckich</Text>
        </View>

        <View style={styles.buttons}>
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={styles.appleBtn}
              onPress={handleApple}
            />
          )}

          <Pressable
            style={[styles.googleBtn, loading === 'google' && styles.btnDisabled]}
            onPress={handleGoogle}
            disabled={loading !== null}>
            {loading === 'google' ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>Kontynuuj przez Google</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.legal}>
          Logując się, akceptujesz Regulamin i Politykę Prywatności.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingBottom: 24, paddingTop: 60 },
  hero: { alignItems: 'center', gap: 12 },
  logo: { fontSize: 72 },
  appName: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -0.5 },
  tagline: { color: '#888', fontSize: 16, textAlign: 'center' },
  buttons: { gap: 14 },
  appleBtn: { height: 54, width: '100%' },
  googleBtn: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnDisabled: { opacity: 0.6 },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '600', color: '#333' },
  legal: { color: '#555', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
