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
import { DISCIPLINE_LABELS } from '@/constants/disciplines';
import { VOIVODESHIP_LABELS } from '@/constants/locations';
import { useAuthStore } from '@/stores/authStore';
import type { Event } from '@/types';

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const CELL = (Dimensions.get('window').width - 32) / 7;

type CalFilters = { discipline: string; level: number | null; status: string; region: string; city: string };

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<CalFilters>({ discipline: '', level: null, status: '', region: '', city: '' });

  const dateFrom = format(currentMonth, 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const savedIds = useSavedIds();
  const { mutate: toggleSave } = useToggleSave();

  const { data: events, isLoading } = useEvents({
    dateFrom,
    dateTo,
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
      const end = parseISO(event.endDate);
      const cur = new Date(start);
      while (cur <= end) {
        const key = format(cur, 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        if (!map[key].some(e => e.id === event.id)) map[key].push(event);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const selectedKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedEvents = selectedKey ? (eventsByDate[selectedKey] ?? []) : [];
  const activeCount = [filters.discipline, filters.level, filters.status, filters.region, filters.city].filter(Boolean).length;

  const monthLabel = format(currentMonth, 'LLLL yyyy', { locale: pl });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

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
              <Text style={s.noEventsText}>Brak zawodów w tym dniu</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>Kalendarz</Text>
              <Pressable style={s.filterBtn} onPress={() => setSheetOpen(true)}>
                <Ionicons name="options-outline" size={20} color={activeCount > 0 ? '#E87722' : '#888'} />
                <Text style={[s.filterBtnText, activeCount > 0 && { color: '#E87722' }]}>
                  Filtry{activeCount > 0 ? ` (${activeCount})` : ''}
                </Text>
              </Pressable>
            </View>

            {/* Active filter chips */}
            {activeCount > 0 && (
              <View style={s.activeFilters}>
                {filters.discipline ? (
                  <ActiveChip
                    label={`🎯 ${DISCIPLINE_LABELS[filters.discipline] ?? filters.discipline}`}
                    onRemove={() => setFilters(f => ({ ...f, discipline: '' }))}
                  />
                ) : null}
                {filters.level ? (
                  <ActiveChip label={`L${filters.level}`} onRemove={() => setFilters(f => ({ ...f, level: null }))} />
                ) : null}
                {filters.status ? (
                  <ActiveChip
                    label={filters.status === 'finished' ? 'Zakończone' : 'Nadchodzące'}
                    onRemove={() => setFilters(f => ({ ...f, status: '' }))}
                  />
                ) : null}
                {filters.region ? (
                  <ActiveChip
                    label={`📍 ${VOIVODESHIP_LABELS[filters.region] ?? filters.region}`}
                    onRemove={() => setFilters(f => ({ ...f, region: '', city: '' }))}
                  />
                ) : null}
                {filters.city ? (
                  <ActiveChip
                    label={`🏙 ${filters.city}`}
                    onRemove={() => setFilters(f => ({ ...f, city: '' }))}
                  />
                ) : null}
                <Pressable onPress={() => setFilters({ discipline: '', level: null, status: '', region: '', city: '' })}>
                  <Text style={s.clearAll}>Wyczyść</Text>
                </Pressable>
              </View>
            )}

            {/* Month navigation */}
            <View style={s.monthNav}>
              <Pressable style={s.navBtn} onPress={prevMonth} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color="#CCC" />
              </Pressable>
              <Text style={s.monthLabel}>{monthLabelCap}</Text>
              <Pressable style={s.navBtn} onPress={nextMonth} hitSlop={8}>
                <Ionicons name="chevron-forward" size={22} color="#CCC" />
              </Pressable>
            </View>

            {/* Day name labels */}
            <View style={s.dayLabelsRow}>
              {DAY_LABELS.map(d => (
                <Text key={d} style={[s.dayLabel, (d === 'So' || d === 'Nd') && s.dayLabelWeekend]}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            {isLoading ? (
              <View style={s.loadingGrid}>
                <ActivityIndicator color="#E87722" />
              </View>
            ) : (
              <View style={s.grid}>
                {calendarDays.map((day, i) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate[key] ?? [];
                  const inMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isTodayDay = isToday(day);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <Pressable
                      key={i}
                      style={[s.cell, isSelected && s.cellSelected, isTodayDay && !isSelected && s.cellToday]}
                      onPress={() => setSelectedDate(isSelected ? null : day)}>
                      <Text style={[
                        s.cellNum,
                        !inMonth && s.cellNumOut,
                        isSelected && s.cellNumSelected,
                        isTodayDay && !isSelected && s.cellNumToday,
                        isWeekend && inMonth && !isSelected && s.cellNumWeekend,
                      ]}>
                        {day.getDate()}
                      </Text>
                      {dayEvents.length > 0 && inMonth && (
                        <View style={s.dots}>
                          {dayEvents.slice(0, 3).map((_, di) => (
                            <View key={di} style={[s.dot, isSelected && s.dotSelected]} />
                          ))}
                          {dayEvents.length > 3 && (
                            <Text style={[s.dotMore, isSelected && s.dotMoreSelected]}>
                              +{dayEvents.length - 3}
                            </Text>
                          )}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Selected day header */}
            {selectedDate && (
              <View style={s.selectedHeader}>
                <Text style={s.selectedTitle}>
                  {format(selectedDate, 'd MMMM', { locale: pl })}
                </Text>
                {selectedEvents.length > 0 && (
                  <Text style={s.selectedCount}>
                    {selectedEvents.length} {selectedEvents.length === 1 ? 'zawody' : 'zawodów'}
                  </Text>
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

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Pressable style={s.activeChip} onPress={onRemove}>
      <Text style={s.activeChipText}>{label}</Text>
      <Ionicons name="close" size={12} color="#E87722" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  listContent: { paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  filterBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#E8772222', borderWidth: 1, borderColor: '#E87722' },
  activeChipText: { color: '#E87722', fontSize: 12, fontWeight: '600' },
  clearAll: { color: '#666', fontSize: 12 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  dayLabelsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  dayLabel: { width: CELL, textAlign: 'center', color: '#666', fontSize: 12, fontWeight: '600' },
  dayLabelWeekend: { color: '#444' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 8 },
  cell: { width: CELL, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 10, gap: 2 },
  cellSelected: { backgroundColor: '#E87722' },
  cellToday: { borderWidth: 1, borderColor: '#E87722' },

  cellNum: { color: '#CCC', fontSize: 15, fontWeight: '500' },
  cellNumOut: { color: '#2A2A2A' },
  cellNumSelected: { color: '#FFF', fontWeight: '700' },
  cellNumToday: { color: '#E87722', fontWeight: '700' },
  cellNumWeekend: { color: '#777' },

  dots: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E87722' },
  dotSelected: { backgroundColor: 'rgba(255,255,255,0.9)' },
  dotMore: { color: '#E87722', fontSize: 8, fontWeight: '700' },
  dotMoreSelected: { color: '#FFF' },

  loadingGrid: { height: 280, alignItems: 'center', justifyContent: 'center' },

  selectedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#1A1A1A', marginTop: 4 },
  selectedTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  selectedCount: { color: '#888', fontSize: 13 },

  noEvents: { padding: 40, alignItems: 'center' },
  noEventsText: { color: '#555', fontSize: 14 },
});
