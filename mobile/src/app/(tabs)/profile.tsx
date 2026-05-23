import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useSavedEvents, useToggleSave } from '@/hooks/useSavedEvents';
import { EventCard } from '@/components/EventCard';
import { D2, MONO } from '@/constants/design';

export default function ProfileScreen() {
  const { user, isLoggedIn, logout } = useAuthStore();
  const { data: savedEvents, isLoading: loadingSaved } = useSavedEvents();
  const { mutate: toggleSave } = useToggleSave();

  if (!isLoggedIn || !user) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Profil</Text>
        </View>
        <View style={s.guestWrap}>
          <Text style={s.guestEyebrow}>GOŚĆ</Text>
          <Text style={s.guestHeadline}>Zaloguj się</Text>
          <Text style={s.guestSub}>Zapisuj zawody, śledź wyniki i otrzymuj powiadomienia.</Text>
          <Pressable style={s.loginBtn} onPress={() => router.push('/auth/login')}>
            <Text style={s.loginBtnText}>ZALOGUJ SIĘ</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/privacy')}>
            <Text style={s.privacyLink}>Polityka prywatności</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  function handleLogout() {
    Alert.alert('Wylogowanie', 'Na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', style: 'destructive', onPress: () => logout() },
    ]);
  }

  const initial  = user.name.charAt(0).toUpperCase();
  const nickname = user.shooterAlias?.toUpperCase() ?? user.name.split(' ')[0].toUpperCase();
  const region   = user.region ? user.region.slice(0, 3).toUpperCase() : '---';
  const saved    = savedEvents?.length ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Profil</Text>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={s.profileRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user.name}</Text>
            <Text style={s.profileSub}>@{nickname} · {user.region?.toUpperCase() ?? 'BRAK REGIONU'}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <Stat label="ZAPISANE" value={String(saved)} accent />
          <View style={s.statDivider} />
          <Stat label="WYNIKI" value="—" />
          <View style={s.statDivider} />
          <Stat label="REGION" value={region} />
        </View>

        {/* Edit button */}
        <Pressable style={s.editBtn} onPress={() => router.push('/profile/edit')}>
          <Text style={s.editBtnText}>EDYTUJ PROFIL</Text>
        </Pressable>

        {/* Account section */}
        <Section label="KONTO">
          <Row label="POZIOM" value={user.tier === 'pro' ? 'PRO' : 'FREE'} />
          {user.shooterAlias && <Row label="PSEUDONIM" value={user.shooterAlias.toUpperCase()} />}
          {user.ipscNumber && <Row label="IPSC" value={user.ipscNumber} />}
          {user.pzssNumber && <Row label="PZSS" value={user.pzssNumber} />}
          {user.region && <Row label="REGION" value={user.region.toUpperCase()} last />}
        </Section>

        {/* Saved events */}
        <Section label="ZAPISANE ZAWODY">
          {loadingSaved ? (
            <ActivityIndicator color={D2.accent} style={{ marginVertical: 16 }} />
          ) : !savedEvents?.length ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>BRAK ZAPISANYCH ZAWODÓW</Text>
            </View>
          ) : (
            savedEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                saved
                onToggleSave={() => toggleSave({ id: event.id, saved: true })}
              />
            ))
          )}
        </Section>

        {/* Info */}
        <Section label="INFORMACJE">
          <Row label="POLITYKA PRYWATNOŚCI" value="›" onPress={() => router.push('/privacy')} last />
        </Section>

        <Pressable style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>WYLOGUJ SIĘ</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, accent && { color: D2.accent }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>{label}</Text>
        <View style={s.sectionLine} />
      </View>
      {children}
    </View>
  );
}

function Row({ label, value, last, onPress }: { label: string; value: string; last?: boolean; onPress?: () => void }) {
  const Inner = (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress}>{Inner}</Pressable>;
  return Inner;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D2.bg },
  header:    { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:     { color: D2.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  content:   { paddingHorizontal: 0, paddingBottom: 40, gap: 16 },

  guestWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  guestEyebrow:  { fontFamily: MONO, fontSize: 10, color: D2.textMute, letterSpacing: 1.4 },
  guestHeadline: { color: D2.text, fontSize: 22, fontWeight: '700' },
  guestSub:      { color: D2.textSub, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  loginBtn:      { backgroundColor: D2.accent, borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14 },
  loginBtnText:  { fontFamily: MONO, color: D2.bg, fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
  privacyLink:   { color: D2.textMute, fontSize: 13, textDecorationLine: 'underline' },

  profileRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20 },
  avatar:      { width: 64, height: 64, borderRadius: 12, backgroundColor: D2.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: D2.bg, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  profileInfo: { flex: 1 },
  profileName: { color: D2.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  profileSub:  { fontFamily: MONO, fontSize: 10, color: D2.textSub, marginTop: 4, letterSpacing: 0.6 },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: D2.surface, borderRadius: 10, borderWidth: 1, borderColor: D2.stroke,
  },
  stat:      { flex: 1, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', gap: 4 },
  statValue: { color: D2.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontFamily: MONO, fontSize: 9, fontWeight: '600', color: D2.textMute, letterSpacing: 1.4 },
  statDivider: { width: 1, backgroundColor: D2.stroke, marginVertical: 12 },

  editBtn: {
    marginHorizontal: 20, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: D2.strokeHi, alignItems: 'center',
  },
  editBtnText: { fontFamily: MONO, fontSize: 11, color: D2.text, fontWeight: '600', letterSpacing: 1.4 },

  section: { paddingHorizontal: 20, gap: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel:  { fontFamily: MONO, fontSize: 10, color: D2.accent, letterSpacing: 1.2 },
  sectionLine:   { flex: 1, height: 1, backgroundColor: D2.stroke },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: D2.surface, borderWidth: 0,
  },
  rowBorder:  { borderBottomWidth: 1, borderBottomColor: D2.stroke },
  rowLabel:   { fontFamily: MONO, fontSize: 10.5, fontWeight: '600', color: D2.textSub, letterSpacing: 1 },
  rowValue:   { fontFamily: MONO, fontSize: 12.5, color: D2.text, fontWeight: '600', letterSpacing: 0.4 },

  emptyCard: { backgroundColor: D2.surface, borderRadius: 10, borderWidth: 1, borderColor: D2.stroke, padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: MONO, fontSize: 11, color: D2.textMute, letterSpacing: 1 },

  logoutBtn:  { marginHorizontal: 20, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: D2.red + '66', backgroundColor: D2.red + '0D' },
  logoutText: { fontFamily: MONO, color: D2.red, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
});
