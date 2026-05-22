import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useSavedEvents, useToggleSave } from '@/hooks/useSavedEvents';
import { EventCard } from '@/components/EventCard';

export default function ProfileScreen() {
  const { user, isLoggedIn, logout } = useAuthStore();
  const { data: savedEvents, isLoading: loadingSaved } = useSavedEvents();
  const { mutate: toggleSave } = useToggleSave();

  if (!isLoggedIn || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.title}>Profil</Text>
        <View style={styles.guestWrap}>
          <Text style={styles.guestIcon}>👤</Text>
          <Text style={styles.guestHeadline}>Zaloguj się</Text>
          <Text style={styles.guestSub}>
            Zapisuj zawody, śledź swoje wyniki i otrzymuj powiadomienia.
          </Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginBtnText}>Zaloguj się</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/privacy')}>
            <Text style={styles.privacyLink}>Polityka prywatności</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  function handleLogout() {
    Alert.alert('Wylogowanie', 'Na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wyloguj',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Profil</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.tier === 'pro' && (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
          <Pressable style={styles.editBtn} onPress={() => router.push('/profile/edit')}>
            <Text style={styles.editBtnText}>Edytuj profil</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konto</Text>
          <View style={styles.sectionCard}>
            <Row label="Poziom konta" value={user.tier === 'pro' ? 'Pro' : 'Free'} />
            {user.shooterAlias && <Row label="Pseudonim" value={user.shooterAlias} />}
            {user.ipscNumber && <Row label="Numer IPSC" value={user.ipscNumber} />}
            {user.pzssNumber && <Row label="Numer PZSS" value={user.pzssNumber} />}
            {user.region && <Row label="Region" value={user.region} />}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zapisane zawody</Text>
          {loadingSaved ? (
            <ActivityIndicator color="#E87722" style={{ marginTop: 16 }} />
          ) : !savedEvents?.length ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Brak zapisanych zawodów</Text>
              <Text style={styles.emptySub}>Zapisuj zawody za pomocą ikony 🔖 na liście</Text>
            </View>
          ) : (
            <View style={{ gap: 0 }}>
              {savedEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  saved
                  onToggleSave={() => toggleSave({ id: event.id, saved: true })}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informacje</Text>
          <View style={styles.sectionCard}>
            <Pressable style={styles.row} onPress={() => router.push('/privacy')}>
              <Text style={styles.rowLabel}>Polityka prywatności</Text>
              <Text style={styles.rowValue}>›</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  content: { padding: 20, gap: 20 },

  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  guestIcon: { fontSize: 56 },
  guestHeadline: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  guestSub: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  loginBtn: { backgroundColor: '#E87722', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 16, marginTop: 8 },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  card: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E87722', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { color: '#FFF', fontSize: 30, fontWeight: '800' },
  name: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  email: { color: '#888', fontSize: 14 },
  proBadge: { backgroundColor: '#E8772233', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#E87722', marginTop: 4 },
  proText: { color: '#E87722', fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  section: { gap: 8 },
  sectionTitle: { color: '#666', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: '#1A1A1A', borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { color: '#CCC', fontSize: 15 },
  rowValue: { color: '#888', fontSize: 15 },

  logoutBtn: { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FF4444' },
  logoutText: { color: '#FF4444', fontSize: 16, fontWeight: '600' },
  editBtn: { marginTop: 12, backgroundColor: '#2A2A2A', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 },
  editBtnText: { color: '#CCC', fontSize: 14, fontWeight: '600' },
  emptyCard: { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { color: '#888', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#555', fontSize: 13, textAlign: 'center' },
  privacyLink: { color: '#555', fontSize: 13, textDecorationLine: 'underline' },
});
