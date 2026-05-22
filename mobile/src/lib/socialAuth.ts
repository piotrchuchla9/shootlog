import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { api } from './api';
import { useAuthStore } from '@/stores/authStore';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;
  if (!idToken) throw new Error('No ID token from Google');

  const { data } = await api.post<{ accessToken: string; refreshToken: string }>('/auth/google', { idToken });

  const { data: me } = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });

  await useAuthStore.getState().setAuth(me, data.accessToken, data.refreshToken);
  return me;
}

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const idToken = credential.identityToken;
  if (!idToken) throw new Error('No identity token from Apple');

  const name = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
    : undefined;

  const { data } = await api.post<{ accessToken: string; refreshToken: string }>('/auth/apple', {
    idToken,
    name,
  });

  const { data: me } = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${data.accessToken}` },
  });

  await useAuthStore.getState().setAuth(me, data.accessToken, data.refreshToken);
  return me;
}
