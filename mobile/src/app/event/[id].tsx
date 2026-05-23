import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useEvent } from '@/hooks/useEvent';
import { DISCIPLINE_LABELS, DISCIPLINE_COLORS, DISCIPLINE_SHORTS } from '@/constants/disciplines';
import { EmptyState } from '@/components/EmptyState';
import { D2, MONO } from '@/constants/design';

function formatDate(startDate: string, endDate: string): string {
  const s = parseISO(startDate);
  const e = parseISO(endDate);
  const sy = s.getFullYear();
  if (startDate === endDate) return format(s, 'd MMMM yyyy', { locale: pl });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}–${format(e, 'd MMMM yyyy', { locale: pl })}`;
  return `${format(s, 'd MMM', { locale: pl })} – ${format(e, 'd MMM yyyy', { locale: pl })}`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event, isLoading, isError } = useEvent(id);

  if (isLoading) {
    return (
      <View style={s.centered}><ActivityIndicator color={D2.accent} size="large" /></View>
    );
  }

  if (isError || !event) {
    return <EmptyState icon="⚠️" title="Nie znaleziono zawodów" />;
  }

  const discColor = DISCIPLINE_COLORS[event.discipline] ?? '#888';
  const discShort = DISCIPLINE_SHORTS[event.discipline] ?? event.discipline.toUpperCase().slice(0, 3);
  const discLabel = DISCIPLINE_LABELS[event.discipline] ?? event.discipline;
  const dateStr   = formatDate(event.startDate, event.endDate);
  const feeStr    = event.entryFee ? `${(event.entryFee / 100).toFixed(0)} zł` : null;

  const now = Date.now();
  const close = event.registrationClose ? new Date(event.registrationClose).getTime() : null;
  const open  = event.registrationOpen  ? new Date(event.registrationOpen).getTime()  : null;
  const isOpen = !!open && open <= now && (!close || close >= now);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Discipline + level row */}
        <View style={s.topRow}>
          <View style={[s.discStrip, { backgroundColor: discColor }]}>
            <Text style={[s.discShort, { color: discColor }]}>{discShort}</Text>
          </View>
          <Text style={[s.discLabel, { color: discColor }]}>{discLabel.toUpperCase()}</Text>
          <View style={s.levelChip}>
            <Text style={s.levelText}>L{event.level}</Text>
          </View>
          {isOpen && (
            <View style={s.openBadge}>
              <View style={[s.openDot, { backgroundColor: '#2BAD68' }]} />
              <Text style={s.openLabel}>OTWARTE</Text>
            </View>
          )}
          <Text style={s.source}>{event.source.toUpperCase()}</Text>
        </View>

        <Text style={s.name}>{event.name}</Text>

        {/* Data rows */}
        <View style={s.rows}>
          <DataRow icon="calendar-outline" label="DATA" value={dateStr} />
          <DataRow icon="location-outline" label="MIEJSCE" value={event.location} />
          {event.city && event.city !== event.location && (
            <DataRow icon="business-outline" label="MIASTO" value={event.city} />
          )}
          {event.organizerName && (
            <DataRow icon="people-outline" label="ORGANIZATOR" value={event.organizerName} />
          )}
          {event.maxShooters != null && (
            <DataRow
              icon="person-outline"
              label="ZAWODNICY"
              value={`${event.currentShooters ?? '?'} / ${event.maxShooters}`}
            />
          )}
          {feeStr && <DataRow icon="card-outline" label="WPISOWE" value={feeStr} />}
        </View>

        {/* Registration */}
        {event.registrationUrl && (
          <View style={s.regSection}>
            {event.registrationClose && (
              <Text style={s.regClose}>
                ZAMKNIĘCIE ZAPISÓW:{' '}
                {new Date(event.registrationClose).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
              </Text>
            )}
            <Pressable
              style={s.regBtn}
              onPress={() => Linking.openURL(event.registrationUrl!)}>
              <Text style={s.regBtnText}>PRZEJDŹ DO ZAPISÓW</Text>
              <Ionicons name="arrow-forward" size={14} color={D2.bg} />
            </Pressable>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function DataRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as any} size={14} color={D2.textMute} style={{ marginTop: 1 }} />
      <View style={s.rowContent}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D2.bg },
  centered:  { flex: 1, backgroundColor: D2.bg, alignItems: 'center', justifyContent: 'center' },
  content:   { padding: 20, gap: 16, paddingBottom: 40 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  discStrip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'transparent' },
  discShort: { fontFamily: MONO, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  discLabel: { fontFamily: MONO, fontSize: 10, fontWeight: '600', letterSpacing: 1.2 },
  levelChip: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: D2.strokeHi },
  levelText: { fontFamily: MONO, fontSize: 10, fontWeight: '600', color: D2.text, letterSpacing: 0.5 },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openDot:   { width: 5, height: 5, borderRadius: 3 },
  openLabel: { fontFamily: MONO, fontSize: 9, fontWeight: '600', color: '#2BAD68', letterSpacing: 1 },
  source:    { fontFamily: MONO, fontSize: 9, color: D2.textFaint, letterSpacing: 0.8, marginLeft: 'auto' },

  name: { color: D2.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 30 },

  rows: { backgroundColor: D2.surface, borderRadius: 10, borderWidth: 1, borderColor: D2.stroke, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: D2.stroke },
  rowContent: { flex: 1, gap: 3 },
  rowLabel:   { fontFamily: MONO, fontSize: 9.5, color: D2.textMute, fontWeight: '600', letterSpacing: 1.2 },
  rowValue:   { color: D2.text, fontSize: 15, fontWeight: '500', lineHeight: 22 },

  regSection: { gap: 10, marginTop: 4 },
  regClose:   { fontFamily: MONO, fontSize: 10, color: D2.textSub, letterSpacing: 0.5 },
  regBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: D2.accent, borderRadius: 10, padding: 16,
  },
  regBtnText: { fontFamily: MONO, color: D2.bg, fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
});
