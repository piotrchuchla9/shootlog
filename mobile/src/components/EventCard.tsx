import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Event } from '@/types';
import { DISCIPLINE_EMOJI, DISCIPLINE_LABELS, LEVEL_COLORS } from '@/constants/disciplines';

const C = {
  card: '#1A1A1A',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#888888',
  openBadge: '#15803D',
  openText: '#86EFAC',
  primary: '#E87722',
};

function isRegistrationOpen(event: Event): boolean {
  if (event.status !== 'upcoming') return false;
  const now = Date.now();
  const open  = event.registrationOpen  ? new Date(event.registrationOpen).getTime()  : null;
  const close = event.registrationClose ? new Date(event.registrationClose).getTime() : null;
  if (open && open > now) return false;
  if (close && close < now) return false;
  return !!open;
}

interface Props {
  event: Event;
  saved?: boolean;
  onToggleSave?: () => void;
}

function formatEventDate(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const startDay = start.toLocaleDateString('pl-PL', { day: 'numeric' });
    const endFull = end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${startDay}–${endFull}`;
  }
  const startShort = start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  const endShort = end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startShort} – ${endShort}`;
}

export function EventCard({ event, saved = false, onToggleSave }: Props) {
  const router = useRouter();
  const dateStr = formatEventDate(event.startDate, event.endDate);
  const open = isRegistrationOpen(event);
  const levelColor = LEVEL_COLORS[event.level] ?? '#6B7280';
  const feeStr = event.entryFee ? `${(event.entryFee / 100).toFixed(0)} zł` : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/event/${event.id}`)}>

      <View style={styles.header}>
        <Text style={styles.discipline}>
          {DISCIPLINE_EMOJI[event.discipline] ?? '🎯'} {DISCIPLINE_LABELS[event.discipline] ?? event.discipline}
        </Text>
        <View style={[styles.levelBadge, { backgroundColor: levelColor + '22', borderColor: levelColor }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>L{event.level}</Text>
        </View>
        {open && (
          <View style={styles.openBadge}>
            <Text style={styles.openText}>Zapisy otwarte</Text>
          </View>
        )}
        {onToggleSave && (
          <Pressable
            onPress={onToggleSave}
            hitSlop={8}
            style={styles.bookmark}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saved ? C.primary : '#555'}
            />
          </Pressable>
        )}
      </View>

      <Text style={styles.name} numberOfLines={2}>{event.name}</Text>

      <Text style={styles.meta}>
        {dateStr}  ·  {event.city ?? event.location}
      </Text>

      <View style={styles.footer}>
        {event.currentShooters != null && event.maxShooters != null && (
          <Text style={styles.shooters}>
            {event.currentShooters}/{event.maxShooters} zawodników
          </Text>
        )}
        {feeStr && <Text style={styles.fee}>{feeStr}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  cardPressed: { opacity: 0.75 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bookmark: { marginLeft: 'auto' },
  discipline: { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  levelBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  levelText: { fontSize: 11, fontWeight: '700' },
  openBadge: {
    backgroundColor: C.openBadge + '33',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  openText: { color: C.openText, fontSize: 11, fontWeight: '600' },
  name: { color: C.text, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  meta: { color: C.textSecondary, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  shooters: { color: C.textSecondary, fontSize: 12 },
  fee: { color: C.primary, fontSize: 12, fontWeight: '600' },
});
