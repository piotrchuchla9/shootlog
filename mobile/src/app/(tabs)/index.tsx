import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useEvents } from '@/hooks/useEvents';
import NearestEventsWidget from '../../../widgets/NearestEventsWidget';
import { useMapEvents } from '@/hooks/useMapEvents';
import { useSavedEvents, useSavedIds, useToggleSave } from '@/hooks/useSavedEvents';
import { EventCard } from '@/components/EventCard';
import { EventsMapView } from '@/components/EventsMapView';
import { EmptyState } from '@/components/EmptyState';
import { FilterSheet } from '@/components/FilterSheet';
import { DISCIPLINE_LABELS, DISCIPLINE_COLORS } from '@/constants/disciplines';
import { VOIVODESHIP_LABELS } from '@/constants/locations';
import { useAuthStore } from '@/stores/authStore';
import { useFilterStore } from '@/stores/filterStore';
import { D2, MONO } from '@/constants/design';

type ViewMode = 'list' | 'map';

export default function HomeScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sheetOpen, setSheetOpen] = useState(false);

  const { discipline, level, status, region, city, setDiscipline, setLevel, setStatus, setRegion, setCity, reset } = useFilterStore();

  const filters = {
    discipline: discipline || undefined,
    level: level ?? undefined,
    status: status || undefined,
    region: region || undefined,
    city: city || undefined,
  };

  const { data: events, isLoading, isError, refetch, isFetching } = useEvents(filters);
  const { data: mapEvents = [], isLoading: mapLoading } = useMapEvents(filters);

  const { data: savedEvents } = useSavedEvents();

  // Push saved upcoming events to the iOS widget whenever saved events change
  useEffect(() => {
    const upcoming = (savedEvents ?? [])
      .filter(e => new Date(e.startDate) >= new Date())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        name: e.name,
        startDate: e.startDate,
        discipline: e.discipline,
        level: e.level,
        city: e.city ?? undefined,
      }));
    NearestEventsWidget.updateSnapshot({ events: upcoming });
  }, [savedEvents]);

  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const savedIds = useSavedIds();
  const { mutate: toggleSave } = useToggleSave();

  const activeCount = [discipline, level, status !== 'upcoming' ? status : '', region, city].filter(Boolean).length;
  const total = events?.length ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>{total > 0 ? `${total} NADCHODZĄCYCH` : 'ZAWODY'}</Text>
          <Text style={s.title}>ShootLog</Text>
        </View>
        <Pressable
          style={[s.filterBtn, activeCount > 0 && { backgroundColor: D2.accent, borderColor: D2.accent }]}
          onPress={() => setSheetOpen(true)}>
          <Ionicons
            name="options-outline"
            size={11}
            color={activeCount > 0 ? D2.bg : D2.text}
          />
          <Text style={[s.filterBtnText, activeCount > 0 && s.filterBtnTextActive]}>
            {activeCount > 0 ? `FILTRY (${activeCount})` : 'FILTRY'}
          </Text>
        </Pressable>
      </View>

      {/* View mode tabs */}
      <View style={s.modeTabs}>
        <Pressable style={s.modeTab} onPress={() => setViewMode('list')}>
          <Text style={[s.modeLabel, viewMode === 'list' && s.modeLabelActive]}>WSZYSTKIE</Text>
          {viewMode === 'list' && <View style={[s.modeUnderline, { backgroundColor: D2.accent }]} />}
        </Pressable>
        <Pressable style={s.modeTab} onPress={() => setViewMode('map')}>
          <Text style={[s.modeLabel, viewMode === 'map' && s.modeLabelActive]}>BLISKO MNIE</Text>
          {viewMode === 'map' && <View style={[s.modeUnderline, { backgroundColor: D2.accent }]} />}
        </Pressable>
      </View>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <View style={s.activeFilters}>
          {discipline ? (
            <ActiveChip
              label={DISCIPLINE_LABELS[discipline] ?? discipline}
              color={DISCIPLINE_COLORS[discipline] ?? D2.accent}
              onRemove={() => setDiscipline('')}
            />
          ) : null}
          {level ? <ActiveChip label={`L${level}`} onRemove={() => setLevel(null)} /> : null}
          {status && status !== 'upcoming' ? (
            <ActiveChip label={status === 'finished' ? 'Zakończone' : status} onRemove={() => setStatus('upcoming')} />
          ) : null}
          {region ? (
            <ActiveChip label={VOIVODESHIP_LABELS[region] ?? region} onRemove={() => setRegion('')} />
          ) : null}
          {city ? <ActiveChip label={city} onRemove={() => setCity('')} /> : null}
          <Pressable onPress={reset}>
            <Text style={s.clearAll}>WYCZYŚĆ</Text>
          </Pressable>
        </View>
      )}

      {/* Content */}
      {viewMode === 'map' ? (
        <EventsMapView events={mapEvents} loading={mapLoading} />
      ) : isLoading ? (
        <View style={s.centered}><ActivityIndicator color={D2.accent} size="large" /></View>
      ) : isError ? (
        <EmptyState icon="⚠️" title="Błąd połączenia" subtitle="Sprawdź połączenie z internetem" />
      ) : !events?.length ? (
        <EmptyState title="Brak zawodów" subtitle="Zmień filtry, by znaleźć zawody" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={e => e.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              saved={savedIds.has(item.id)}
              onToggleSave={isLoggedIn ? () => toggleSave({ id: item.id, saved: savedIds.has(item.id) }) : undefined}
            />
          )}
          contentContainerStyle={s.list}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FilterSheet
        visible={sheetOpen}
        filters={{ discipline, level, status, region, city }}
        onApply={(f) => { setDiscipline(f.discipline); setLevel(f.level); setStatus(f.status); setRegion(f.region); setCity(f.city); }}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

function ActiveChip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  const c = color ?? D2.accent;
  return (
    <Pressable style={[s.activeChip, { borderColor: c, backgroundColor: c + '15' }]} onPress={onRemove}>
      <Text style={[s.activeChipText, { color: c }]}>{label.toUpperCase()}</Text>
      <Ionicons name="close" size={10} color={c} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D2.bg },

  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  eyebrow: { fontFamily: MONO, fontSize: 10, color: D2.textMute, letterSpacing: 1.2, marginBottom: 3 },
  title:   { color: D2.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.8, lineHeight: 34 },

  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: D2.strokeHi,
    marginBottom: 2,
  },
  filterBtnText: { fontFamily: MONO, fontSize: 10, color: D2.text, fontWeight: '600', letterSpacing: 1 },
  filterBtnTextActive: { color: D2.bg },

  modeTabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 14, gap: 20 },
  modeTab: { paddingBottom: 8, position: 'relative' },
  modeLabel: { fontFamily: MONO, fontSize: 10.5, fontWeight: '600', letterSpacing: 1.4, color: D2.textMute },
  modeLabelActive: { color: D2.text },
  modeUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },

  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingBottom: 10, gap: 6, alignItems: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  activeChipText: { fontFamily: MONO, fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
  clearAll: { fontFamily: MONO, fontSize: 10, color: D2.textMute, letterSpacing: 0.6 },

  list:    { paddingTop: 4, paddingBottom: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
