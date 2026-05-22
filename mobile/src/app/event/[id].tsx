import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/useEvent';
import { DISCIPLINE_EMOJI, DISCIPLINE_LABELS, LEVEL_COLORS } from '@/constants/disciplines';
import { EmptyState } from '@/components/EmptyState';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, isError } = useEvent(id);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#E87722" size="large" />
      </View>
    );
  }

  if (isError || !event) {
    return <EmptyState icon="⚠️" title="Nie znaleziono zawodów" />;
  }

  const startDate = new Date(event.startDate).toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const endDate = new Date(event.endDate).toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const levelColor = LEVEL_COLORS[event.level] ?? '#6B7280';
  const feeStr = event.entryFee ? `${(event.entryFee / 100).toFixed(0)} zł` : null;

  const isOpen = event.registrationOpen && event.registrationClose
    ? new Date(event.registrationOpen) < new Date() && new Date(event.registrationClose) > new Date()
    : false;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Badges */}
        <View style={styles.badges}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + '22', borderColor: levelColor }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>L{event.level}</Text>
          </View>
          <Text style={styles.discipline}>
            {DISCIPLINE_EMOJI[event.discipline] ?? '🎯'} {DISCIPLINE_LABELS[event.discipline] ?? event.discipline}
          </Text>
          <Text style={styles.source}>{event.source.toUpperCase()}</Text>
        </View>

        <Text style={styles.name}>{event.name}</Text>

        <Row icon="📅" label="Data" value={`${startDate}${event.endDate !== event.startDate ? ` — ${endDate}` : ''}`} />
        <Row icon="📍" label="Miejsce" value={event.location} />
        {event.organizerName && <Row icon="🏛" label="Organizator" value={event.organizerName} />}
        {feeStr && <Row icon="💰" label="Wpisowe" value={feeStr} />}
        {event.currentShooters != null && event.maxShooters != null && (
          <Row icon="👥" label="Zawodnicy" value={`${event.currentShooters} / ${event.maxShooters}`} />
        )}

        {/* Registration */}
        {event.registrationUrl && (
          <View style={styles.regSection}>
            {isOpen && (
              <View style={styles.openBanner}>
                <Text style={styles.openText}>✅ Zapisy są otwarte!</Text>
              </View>
            )}
            {event.registrationClose && (
              <Text style={styles.regClose}>
                Zamknięcie zapisów: {new Date(event.registrationClose).toLocaleDateString('pl-PL')}
              </Text>
            )}
            <Pressable
              style={styles.regBtn}
              onPress={() => Linking.openURL(event.registrationUrl!)}>
              <Text style={styles.regBtnText}>Przejdź do zapisów →</Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  centered: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  levelBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  levelText: { fontSize: 13, fontWeight: '700' },
  discipline: { color: '#888', fontSize: 14, fontWeight: '500' },
  source: { color: '#555', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  name: { color: '#FFF', fontSize: 22, fontWeight: '800', lineHeight: 30 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  rowIcon: { fontSize: 18, width: 24, textAlign: 'center', marginTop: 2 },
  rowContent: { flex: 1, gap: 2 },
  rowLabel: { color: '#666', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { color: '#DDD', fontSize: 15, lineHeight: 22 },
  regSection: { marginTop: 8, gap: 12 },
  openBanner: { backgroundColor: '#15803D22', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#15803D' },
  openText: { color: '#86EFAC', fontSize: 15, fontWeight: '600' },
  regClose: { color: '#888', fontSize: 13 },
  regBtn: {
    backgroundColor: '#E87722', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  regBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
