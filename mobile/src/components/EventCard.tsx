import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Event } from '@/types';
import { DISCIPLINE_LABELS, DISCIPLINE_COLORS } from '@/constants/disciplines';
import { D2, MONO } from '@/constants/design';

function shortDate(startDate: string, endDate: string): string {
  const s = parseISO(startDate);
  const e = parseISO(endDate);
  if (startDate === endDate) return format(s, 'd MMM', { locale: pl });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}–${format(e, 'd MMM', { locale: pl })}`;
  return `${format(s, 'd MMM', { locale: pl })} – ${format(e, 'd MMM', { locale: pl })}`;
}

type SignupStatus = 'open' | 'closing' | 'closed';

function getSignupStatus(event: Event): SignupStatus {
  if (event.status !== 'upcoming') return 'closed';
  const now = Date.now();
  const close = event.registrationClose ? new Date(event.registrationClose).getTime() : null;
  const open  = event.registrationOpen  ? new Date(event.registrationOpen).getTime()  : null;
  if (!open) return 'closed';
  if (open > now) return 'closed';
  if (close && close < now) return 'closed';
  if (close && (close - now) < 1000 * 60 * 60 * 72) return 'closing';
  return 'open';
}

const STATUS = {
  open:    { color: '#2BAD68', label: 'OTWARTE' },
  closing: { color: '#C4A632', label: 'KOŃCZĄ SIĘ' },
  closed:  { color: 'rgba(245,239,230,0.28)', label: 'ZAMKNIĘTE' },
};

interface Props {
  event: Event;
  saved?: boolean;
  onToggleSave?: () => void;
}

export function EventCard({ event, saved = false, onToggleSave }: Props) {
  const router = useRouter();
  const discColor = DISCIPLINE_COLORS[event.discipline] ?? '#888';
  const title     = DISCIPLINE_LABELS[event.discipline] ?? event.discipline;
  const signupStatus = getSignupStatus(event);
  const st = STATUS[signupStatus];
  const date = shortDate(event.startDate, event.endDate);
  const location = event.city ?? event.location;

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.pressed]}
      onPress={() => router.push(`/event/${event.id}`)}>

      {/* Discipline color strip */}
      <View style={[s.strip, { backgroundColor: discColor }]} />

      <View style={s.inner}>
        {/* Top row: disc tag + level chip + signup dot */}
        <View style={s.topRow}>
          <View style={s.discTag}>
            <Text style={[s.discLabel, { color: discColor }]}>{title.toUpperCase()}</Text>
          </View>
          <View style={s.levelChip}>
            <Text style={s.levelText}>L{event.level}</Text>
          </View>
          <View style={s.signupDot}>
            <View style={[s.dot, { backgroundColor: st.color, shadowColor: st.color }]} />
            <Text style={[s.signupLabel, { color: st.color }]}>{st.label}</Text>
          </View>
          {onToggleSave && (
            <Pressable onPress={onToggleSave} hitSlop={10} style={s.bookmark}>
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={saved ? D2.accent : D2.textMute}
              />
            </Pressable>
          )}
        </View>

        {/* Event name */}
        <Text style={s.name} numberOfLines={2}>{event.name}</Text>

        {/* Meta row: date + location */}
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={10} color={D2.textSub} />
          <Text style={s.metaText}>{date}</Text>
          <Ionicons name="location-outline" size={10} color={D2.textSub} />
          <Text style={s.metaText} numberOfLines={1}>{location}</Text>
          {event.maxShooters != null && (
            <Text style={s.shooters}>{event.currentShooters ?? '?'}/{event.maxShooters}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: D2.surface,
    borderWidth: 1,
    borderColor: D2.stroke,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
  strip: { width: 3 },
  inner: { flex: 1, padding: 14, paddingLeft: 12, gap: 8 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  discTag: { flexDirection: 'row', alignItems: 'center' },
  discLabel: { fontFamily: MONO, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },

  levelChip: {
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 4, borderWidth: 1, borderColor: D2.strokeHi,
  },
  levelText: { fontFamily: MONO, fontSize: 10, fontWeight: '600', color: D2.text, letterSpacing: 0.5 },

  signupDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4, elevation: 3,
  },
  signupLabel: { fontFamily: MONO, fontSize: 9, fontWeight: '600', letterSpacing: 1 },

  bookmark: { marginLeft: 'auto' },

  name: {
    color: D2.text, fontSize: 16, fontWeight: '600',
    letterSpacing: -0.3, lineHeight: 22,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'nowrap' },
  metaText: {
    fontFamily: MONO, fontSize: 11, color: D2.textSub, fontWeight: '500',
    flexShrink: 1,
  },
  shooters: {
    fontFamily: MONO, fontSize: 11, color: D2.textMute, marginLeft: 'auto',
  },
});
