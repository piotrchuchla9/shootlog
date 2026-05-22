import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useMapEvents } from '@/hooks/useMapEvents';
import { useSavedIds, useToggleSave } from '@/hooks/useSavedEvents';
import { EventCard } from '@/components/EventCard';
import { EventsMapView } from '@/components/EventsMapView';
import { EmptyState } from '@/components/EmptyState';
import { FilterSheet } from '@/components/FilterSheet';
import { DISCIPLINE_LABELS } from '@/constants/disciplines';
import { VOIVODESHIP_LABELS } from '@/constants/locations';
import { useAuthStore } from '@/stores/authStore';
import { useFilterStore } from '@/stores/filterStore';

type Tab = 'list' | 'map';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('list');
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

  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const savedIds = useSavedIds();
  const { mutate: toggleSave } = useToggleSave();

  const activeCount = [discipline, level, status !== 'upcoming' ? status : '', region, city].filter(Boolean).length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>ShootLog</Text>
        <Pressable style={s.filterBtn} onPress={() => setSheetOpen(true)}>
          <Ionicons name="options-outline" size={20} color={activeCount > 0 ? '#E87722' : '#888'} />
          <Text style={[s.filterBtnText, activeCount > 0 && { color: '#E87722' }]}>
            Filtry{activeCount > 0 ? ` (${activeCount})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Tab switcher */}
      <View style={s.tabSwitcher}>
        <Pressable style={[s.tabBtn, activeTab === 'list' && s.tabBtnActive]} onPress={() => setActiveTab('list')}>
          <Ionicons name="list" size={15} color={activeTab === 'list' ? '#E87722' : '#888'} />
          <Text style={[s.tabBtnText, activeTab === 'list' && s.tabBtnTextActive]}>Wszystkie</Text>
        </Pressable>
        <Pressable style={[s.tabBtn, activeTab === 'map' && s.tabBtnActive]} onPress={() => setActiveTab('map')}>
          <Ionicons name="map" size={15} color={activeTab === 'map' ? '#E87722' : '#888'} />
          <Text style={[s.tabBtnText, activeTab === 'map' && s.tabBtnTextActive]}>Blisko mnie</Text>
        </Pressable>
      </View>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <View style={s.activeFilters}>
          {discipline ? <ActiveChip label={`🎯 ${DISCIPLINE_LABELS[discipline] ?? discipline}`} onRemove={() => setDiscipline('')} /> : null}
          {level ? <ActiveChip label={`L${level}`} onRemove={() => setLevel(null)} /> : null}
          {status && status !== 'upcoming' ? <ActiveChip label={status === 'finished' ? 'Zakończone' : status} onRemove={() => setStatus('upcoming')} /> : null}
          {region ? <ActiveChip label={`📍 ${VOIVODESHIP_LABELS[region] ?? region}`} onRemove={() => setRegion('')} /> : null}
          {city ? <ActiveChip label={`🏙 ${city}`} onRemove={() => setCity('')} /> : null}
          <Pressable onPress={reset}><Text style={s.clearAll}>Wyczyść</Text></Pressable>
        </View>
      )}

      {/* Content */}
      {activeTab === 'map' ? (
        <EventsMapView events={mapEvents} loading={mapLoading} />
      ) : isLoading ? (
        <View style={s.centered}><ActivityIndicator color="#E87722" size="large" /></View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  filterBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },

  tabSwitcher: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },
  tabBtnActive: { backgroundColor: '#2A2A2A' },
  tabBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  tabBtnTextActive: { color: '#E87722' },

  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#E8772222', borderWidth: 1, borderColor: '#E87722' },
  activeChipText: { color: '#E87722', fontSize: 12, fontWeight: '600' },
  clearAll: { color: '#666', fontSize: 12 },

  list: { paddingTop: 4, paddingBottom: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
