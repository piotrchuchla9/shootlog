import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import MapView, { Marker, Region, MarkerPressEvent } from 'react-native-maps';
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapEvent } from '@/types';
import { LEVEL_COLORS, DISCIPLINE_EMOJI } from '@/constants/disciplines';

async function fetchLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    // getLastKnownPositionAsync is instant and works on simulator
    const last = await Location.getLastKnownPositionAsync();
    if (last) return { lat: last.coords.latitude, lng: last.coords.longitude };
    // fallback to current position (may be slow/fail on simulator)
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}

const POLAND_REGION: Region = {
  latitude: 52.0,
  longitude: 19.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

// Group events within ~111m (3 decimal places)
function clusterEvents(events: MapEvent[]): Map<string, MapEvent[]> {
  const map = new Map<string, MapEvent[]>();
  for (const ev of events) {
    const key = `${ev.lat.toFixed(3)},${ev.lng.toFixed(3)}`;
    const existing = map.get(key);
    if (existing) existing.push(ev);
    else map.set(key, [ev]);
  }
  return map;
}

type Props = { events: MapEvent[]; loading: boolean };

export function EventsMapView({ events, loading }: Props) {
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<MapEvent[]>([]);
  const currentRegion = useRef<Region>(POLAND_REGION);

  useEffect(() => {
    fetchLocation().then(coords => {
      if (!coords) return;
      setUserLocation(coords);
      mapRef.current?.animateToRegion({ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 1.5, longitudeDelta: 1.5 }, 800);
    });
  }, []);

  async function centerOnUser() {
    const coords = userLocation ?? await fetchLocation();
    if (!coords) return;
    if (!userLocation) setUserLocation(coords);
    mapRef.current?.animateToRegion({ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 1.5, longitudeDelta: 1.5 }, 600);
  }

  function zoomIn() {
    const r = currentRegion.current;
    mapRef.current?.animateToRegion({ ...r, latitudeDelta: r.latitudeDelta / 2, longitudeDelta: r.longitudeDelta / 2 }, 300);
  }

  function zoomOut() {
    const r = currentRegion.current;
    mapRef.current?.animateToRegion({ ...r, latitudeDelta: Math.min(r.latitudeDelta * 2, 60), longitudeDelta: Math.min(r.longitudeDelta * 2, 60) }, 300);
  }

  const clusters = clusterEvents(events);

  function handleMarkerPress(e: MarkerPressEvent) {
    const key = e.nativeEvent.id;
    const cluster = clusters.get(key);
    if (cluster) setSelected(cluster);
  }

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={POLAND_REGION}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        onPress={() => setSelected([])}
        onMarkerPress={handleMarkerPress}
        onRegionChange={(r) => { currentRegion.current = r; }}
      >
        {Array.from(clusters.entries()).map(([key, clusterEvts]) => {
          const [lat, lng] = key.split(',').map(Number);
          const count = clusterEvts.length;
          const first = clusterEvts[0];
          const color = count > 1 ? '#E87722' : (LEVEL_COLORS[first.level] ?? '#E87722');

          return (
            <Marker
              key={key}
              identifier={key}
              coordinate={{ latitude: lat, longitude: lng }}
              tracksViewChanges={false}
            >
              <View style={[s.pin, { backgroundColor: color }]}>
                {count > 1
                  ? <Text style={s.pinCount}>{count}</Text>
                  : <Text style={s.pinEmoji}>{DISCIPLINE_EMOJI[first.discipline] ?? '🎯'}</Text>}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color="#E87722" />
        </View>
      )}

      {!loading && events.length === 0 && (
        <View style={s.emptyOverlay}>
          <Text style={s.emptyText}>Brak zawodów z lokalizacją</Text>
          <Text style={s.emptySub}>Dane uzupełniane w tle</Text>
        </View>
      )}

      <View style={s.controls}>
        <Pressable style={s.controlBtn} onPress={zoomIn}>
          <Ionicons name="add" size={22} color="#FFF" />
        </Pressable>
        <View style={s.controlDivider} />
        <Pressable style={s.controlBtn} onPress={zoomOut}>
          <Ionicons name="remove" size={22} color="#FFF" />
        </Pressable>
      </View>

      <Pressable style={s.locBtn} onPress={centerOnUser}>
        <Ionicons name="locate" size={20} color={userLocation ? '#E87722' : '#FFF'} />
      </Pressable>

      {/* Bottom card — single event or list */}
      {selected.length === 1 && (
        <Pressable style={s.card} onPress={() => router.push(`/event/${selected[0].id}`)}>
          <View style={s.cardInner}>
            <Text style={s.cardMeta}>{DISCIPLINE_EMOJI[selected[0].discipline] ?? '🎯'} L{selected[0].level} · {selected[0].city ?? '—'}</Text>
            <Text style={s.cardName} numberOfLines={2}>{selected[0].name}</Text>
            <Text style={s.cardDate}>{new Date(selected[0].startDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#888" />
        </Pressable>
      )}

      {selected.length > 1 && (
        <View style={s.clusterCard}>
          <Text style={s.clusterTitle}>{selected.length} zawody w tym miejscu</Text>
          <ScrollView style={s.clusterList} showsVerticalScrollIndicator={false}>
            {selected.map(ev => (
              <Pressable key={ev.id} style={s.clusterRow} onPress={() => router.push(`/event/${ev.id}`)}>
                <View style={s.clusterRowInner}>
                  <Text style={s.clusterMeta}>{DISCIPLINE_EMOJI[ev.discipline] ?? '🎯'} L{ev.level} · {new Date(ev.startDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}</Text>
                  <Text style={s.clusterName} numberOfLines={1}>{ev.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#888" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  pin: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pinCount: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  pinEmoji: { fontSize: 16 },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D88' },

  emptyOverlay: { position: 'absolute', bottom: 120, left: 20, right: 20, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, alignItems: 'center' },
  emptyText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#888', fontSize: 13, marginTop: 4 },

  controls: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#1A1A1AEE', borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  controlBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  controlBtnDisabled: { opacity: 0.4 },
  controlDivider: { height: 1, backgroundColor: '#2A2A2A', marginHorizontal: 8 },
  locBtn: {
    position: 'absolute', bottom: 16, right: 16,
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1A1A1AEE', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },

  // Single event card
  card: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  cardInner: { flex: 1 },
  cardMeta: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  cardName: { color: '#FFF', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  cardDate: { color: '#E87722', fontSize: 13, marginTop: 4 },

  // Cluster card
  clusterCard: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, maxHeight: 260, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  clusterTitle: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  clusterList: { flexGrow: 0 },
  clusterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  clusterRowInner: { flex: 1 },
  clusterMeta: { color: '#888', fontSize: 12, marginBottom: 2 },
  clusterName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
