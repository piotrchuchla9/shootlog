import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, addMonths, subMonths,
  eachDayOfInterval, startOfWeek, endOfWeek,
  isSameMonth, isToday, isSameDay, parseISO,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { useEvents } from '@/hooks/useEvents';
import { useSavedIds, useToggleSave } from '@/hooks/useSavedEvents';
import { EventCard } from '@/components/EventCard';
import { FilterSheet } from '@/components/FilterSheet';
import { useAuthStore } from '@/stores/authStore';
import { D2, MONO } from '@/constants/design';
import type { Event } from '@/types';

const DAY_LABELS = ['PN','WT','ŚR','CZ','PT','SO','ND'];
const { width } = Dimensions.get('window');
const GRID_PAD = 16;
const CELL_GAP = 4;
const CELL = (width - GRID_PAD * 2 - CELL_GAP * 6) / 7;
const CELL_H = 52;

type CalFilters = { discipline: string; level: number | null; status: string; region: string; city: string };

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<CalFilters>({ discipline: '', level: null, status: '', region: '', city: '' });

  const dateFrom = format(currentMonth, 'yyyy-MM-dd');
  const dateTo   = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const savedIds = useSavedIds();
  const { mutate: toggleSave } = useToggleSave();

  const { data: events, isLoading } = useEvents({
    dateFrom, dateTo,
    discipline: filters.discipline || undefined,
    level: filters.level ?? undefined,
    status: filters.status || undefined,
    region: filters.region || undefined,
    city: filters.city || undefined,
    pageSize: 100,
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    (events ?? []).forEach(event => {
      const start = parseISO(event.startDate);
      const end   = parseISO(event.endDate);
      const cur   = new Date(start);
      while (cur <= end) {
        const key = format(cur, 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        if (!map[key].some(e => e.id === event.id)) map[key].push(event);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  // Max events on any day — for heatmap intensity
  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(eventsByDate).map(a => a.length));
  }, [eventsByDate]);

  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const gridEnd   = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const selectedKey    = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedEvents = selectedKey ? (eventsByDate[selectedKey] ?? []) : [];
  const totalEvents    = events?.length ?? 0;
  const activeCount    = [filters.discipline, filters.level, filters.status, filters.region, filters.city].filter(Boolean).length;

  const monthLabel = format(currentMonth, 'LLLL', { locale: pl }).toUpperCase();
  const yearLabel  = format(currentMonth, 'yyyy');

  function prevMonth() { setCurrentMonth(m => subMonths(m, 1)); setSelectedDate(null); }
  function nextMonth() { setCurrentMonth(m => addMonths(m, 1)); setSelectedDate(null); }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={selectedDate ? selectedEvents : ([] as Event[])}
        keyExtractor={e => e.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            saved={savedIds.has(item.id)}
            onToggleSave={isLoggedIn ? () => toggleSave({ id: item.id, saved: savedIds.has(item.id) }) : undefined}
          />
        )}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          selectedDate ? (
            <View style={s.noEvents}>
              <Text style={s.noEventsText}>BRAK ZAWODÓW</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.eyebrow}>{yearLabel}</Text>
                <Text style={s.title}>Kalendarz</Text>
              </View>
              <Pressable
                style={[s.filterBtn, activeCount > 0 && { backgroundColor: D2.accent, borderColor: D2.accent }]}
                onPress={() => setSheetOpen(true)}>
                <Ionicons name="options-outline" size={11} color={activeCount > 0 ? D2.bg : D2.text} />
                <Text style={[s.filterBtnText, activeCount > 0 && { color: D2.bg }]}>
                  {activeCount > 0 ? `FILTRY (${activeCount})` : 'FILTRY'}
                </Text>
              </Pressable>
            </View>

            {/* Month navigation */}
            <View style={s.monthNav}>
              <View style={s.monthLeft}>
                <Pressable style={s.navBtn} onPress={prevMonth} hitSlop={8}>
                  <Text style={s.navArrow}>‹</Text>
                </Pressable>
                <Text style={s.monthLabel}>{monthLabel}</Text>
                <Pressable style={s.navBtn} onPress={nextMonth} hitSlop={8}>
                  <Text style={s.navArrow}>›</Text>
                </Pressable>
              </View>
              <Text style={s.monthCount}>
                <Text style={{ color: D2.accent }}>{totalEvents}</Text>
                {' '}ZAWODÓW
              </Text>
            </View>

            {/* Day labels */}
            <View style={s.dayLabelsRow}>
              {DAY_LABELS.map(d => (
                <Text key={d} style={s.dayLabel}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            {isLoading ? (
              <View style={s.loadingGrid}><ActivityIndicator color={D2.accent} /></View>
            ) : (
              <View style={s.grid}>
                {calendarDays.map((day, i) => {
                  const key       = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate[key] ?? [];
                  const inMonth   = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isTodayDay = isToday(day);
                  const n         = inMonth ? dayEvents.length : 0;
                  const intensity = n > 0 ? Math.min(n / maxCount, 1) : 0;

                  return (
                    <Pressable
                      key={i}
                      style={[
                        s.cell,
                        isSelected && { backgroundColor: D2.accent },
                        !isSelected && n > 0 && { backgroundColor: `rgba(249,115,22,${intensity * 0.45})` },
                        isTodayDay && !isSelected && s.cellToday,
                      ]}
                      onPress={() => inMonth && setSelectedDate(isSelected ? null : day)}>
                      <Text style={[
                        s.cellNum,
                        !inMonth && s.cellNumOut,
                        isSelected && s.cellNumSelected,
                        isTodayDay && !isSelected && s.cellNumToday,
                      ]}>
                        {day.getDate()}
                      </Text>
                      {n > 0 && inMonth && (
                        <Text style={[s.cellCount, isSelected && s.cellCountSelected]}>·{n}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Selected day header */}
            {selectedDate && (
              <View style={s.selectedHeader}>
                <View style={s.selectedLeft}>
                  <Text style={s.selectedDay}>{format(selectedDate, 'd')}</Text>
                  <Text style={s.selectedMeta}>
                    {format(selectedDate, 'MMMM · EEEE', { locale: pl }).toUpperCase()}
                  </Text>
                </View>
                {selectedEvents.length > 0 && (
                  <Text style={s.selectedCount}>{selectedEvents.length} ZAWODÓW</Text>
                )}
              </View>
            )}
          </View>
        }
      />

      <FilterSheet
        visible={sheetOpen}
        filters={{ discipline: filters.discipline, level: filters.level, status: filters.status || 'upcoming', region: filters.region, city: filters.city }}
        onApply={(f) => setFilters({ ...f, status: f.status })}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: D2.bg },
  listContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  eyebrow: { fontFamily: MONO, fontSize: 10, color: D2.textMute, letterSpacing: 1.2, marginBottom: 3 },
  title:   { color: D2.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.8, lineHeight: 34 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: D2.strokeHi, marginBottom: 2,
  },
  filterBtnText: { fontFamily: MONO, fontSize: 10, color: D2.text, fontWeight: '600', letterSpacing: 1 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  monthLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navBtn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: D2.surface, borderWidth: 1, borderColor: D2.strokeHi,
    alignItems: 'center', justifyContent: 'center',
  },
  navArrow:   { color: D2.text, fontSize: 18, lineHeight: 22, fontWeight: '500' },
  monthLabel: { color: D2.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3, paddingHorizontal: 8 },
  monthCount: { fontFamily: MONO, fontSize: 10, color: D2.textSub, fontWeight: '600', letterSpacing: 1 },

  dayLabelsRow: { flexDirection: 'row', paddingHorizontal: GRID_PAD, marginBottom: 6, gap: CELL_GAP },
  dayLabel: {
    width: CELL, textAlign: 'center',
    fontFamily: MONO, fontSize: 9.5, fontWeight: '600', color: D2.textMute, letterSpacing: 1.2,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GRID_PAD, marginBottom: 4, gap: CELL_GAP },
  cell: {
    width: CELL, height: CELL_H, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  cellToday:        { borderWidth: 1, borderColor: D2.accent },
  cellNum:          { fontFamily: MONO, fontSize: 12, fontWeight: '600', color: D2.text },
  cellNumOut:       { color: D2.textFaint },
  cellNumSelected:  { color: D2.bg, fontWeight: '700' },
  cellNumToday:     { color: D2.accent },
  cellCount:        { fontFamily: MONO, fontSize: 8, fontWeight: '700', color: D2.text, opacity: 0.7 },
  cellCountSelected: { color: D2.bg, opacity: 1 },

  loadingGrid: { height: 260, alignItems: 'center', justifyContent: 'center' },

  selectedHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: D2.stroke, marginTop: 8,
  },
  selectedLeft:  { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  selectedDay:   { color: D2.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  selectedMeta:  { fontFamily: MONO, fontSize: 10, fontWeight: '600', color: D2.textSub, letterSpacing: 1.2 },
  selectedCount: { fontFamily: MONO, fontSize: 10, fontWeight: '600', color: D2.accent, letterSpacing: 1.2 },

  noEvents: { padding: 40, alignItems: 'center' },
  noEventsText: { fontFamily: MONO, fontSize: 12, color: D2.textMute, letterSpacing: 1.2 },
});
