import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import MapView, { Marker, Region, MarkerPressEvent } from 'react-native-maps';
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { MapEvent } from '@/types';
import { DISCIPLINE_COLORS, DISCIPLINE_SHORTS } from '@/constants/disciplines';
import { D2, MONO } from '@/constants/design';

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
          const discColor = DISCIPLINE_COLORS[first.discipline] ?? D2.accent;
          const isCluster = count > 1;

          return (
            <Marker
              key={key}
              identifier={key}
              coordinate={{ latitude: lat, longitude: lng }}
              tracksViewChanges={false}
            >
              {isCluster ? (
                <View style={s.clusterPin}>
                  <Text style={s.clusterPinCount}>{count}</Text>
                </View>
              ) : (
                <View style={[s.pin, { backgroundColor: discColor }]}>
                  <Text style={s.pinShort}>{DISCIPLINE_SHORTS[first.discipline] ?? 'PST'}</Text>
                  <Text style={s.pinLevel}>L{first.level}</Text>
                </View>
              )}
            </Marker>
          );
        })}
      </MapView>

      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color={D2.accent} />
        </View>
      )}

      {!loading && events.length === 0 && (
        <View style={s.emptyOverlay}>
          <Text style={s.emptyText}>BRAK ZAWODÓW Z LOKALIZACJĄ</Text>
          <Text style={s.emptySub}>Dane uzupełniane w tle</Text>
        </View>
      )}

      <View style={s.controls}>
        <Pressable style={s.controlBtn} onPress={zoomIn}>
          <Ionicons name="add" size={20} color={D2.text} />
        </Pressable>
        <View style={s.controlDivider} />
        <Pressable style={s.controlBtn} onPress={zoomOut}>
          <Ionicons name="remove" size={20} color={D2.text} />
        </Pressable>
      </View>

      <Pressable style={s.locBtn} onPress={centerOnUser}>
        <Ionicons name="locate" size={18} color={userLocation ? D2.accent : D2.textSub} />
      </Pressable>

      {selected.length === 1 && (() => {
        const ev = selected[0];
        const discColor = DISCIPLINE_COLORS[ev.discipline] ?? D2.accent;
        const dateStr = format(parseISO(ev.startDate), 'd MMM yyyy', { locale: pl }).toUpperCase();
        return (
          <Pressable style={s.card} onPress={() => router.push(`/event/${ev.id}`)}>
            <View style={[s.cardStrip, { backgroundColor: discColor }]} />
            <View style={s.cardInner}>
              <Text style={s.cardMeta}>L{ev.level} · {ev.city ?? '—'}</Text>
              <Text style={s.cardName} numberOfLines={2}>{ev.name}</Text>
              <Text style={s.cardDate}>{dateStr}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={D2.textMute} />
          </Pressable>
        );
      })()}

      {selected.length > 1 && (
        <View style={s.multiCard}>
          <Text style={s.multiTitle}>{selected.length} ZAWODY W TYM MIEJSCU</Text>
          <ScrollView style={s.multiList} showsVerticalScrollIndicator={false}>
            {selected.map(ev => {
              const discColor = DISCIPLINE_COLORS[ev.discipline] ?? D2.accent;
              const dateStr = format(parseISO(ev.startDate), 'd MMM', { locale: pl }).toUpperCase();
              return (
                <Pressable key={ev.id} style={s.multiRow} onPress={() => router.push(`/event/${ev.id}`)}>
                  <View style={[s.multiStrip, { backgroundColor: discColor }]} />
                  <View style={s.multiRowInner}>
                    <Text style={s.multiMeta}>L{ev.level} · {dateStr}</Text>
                    <Text style={s.multiName} numberOfLines={1}>{ev.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={D2.textMute} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const SHADOW = {
  shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
};

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Single discipline pin
  pin: {
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', gap: 1,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinShort: { fontFamily: MONO, color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  pinLevel: { fontFamily: MONO, color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: '600' },

  // Cluster pin
  clusterPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: D2.surface, borderWidth: 2, borderColor: D2.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  clusterPinCount: { fontFamily: MONO, color: D2.accent, fontSize: 13, fontWeight: '800' },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: `${D2.bg}AA` },

  emptyOverlay: { position: 'absolute', bottom: 120, left: 20, right: 20, backgroundColor: D2.surface, borderRadius: 12, borderWidth: 1, borderColor: D2.stroke, padding: 16, alignItems: 'center', gap: 4 },
  emptyText: { fontFamily: MONO, color: D2.text, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  emptySub: { fontFamily: MONO, color: D2.textMute, fontSize: 10, letterSpacing: 0.5 },

  controls: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: D2.surface, borderRadius: 10,
    borderWidth: 1, borderColor: D2.strokeHi,
    overflow: 'hidden', ...SHADOW,
  },
  controlBtn: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  controlDivider: { height: 1, backgroundColor: D2.stroke },
  locBtn: {
    position: 'absolute', bottom: 16, right: 16,
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: D2.surface, borderWidth: 1, borderColor: D2.strokeHi,
    justifyContent: 'center', alignItems: 'center', ...SHADOW,
  },

  // Single event bottom card
  card: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: D2.surface, borderRadius: 12,
    borderWidth: 1, borderColor: D2.strokeHi,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    ...SHADOW,
  },
  cardStrip: { width: 3, alignSelf: 'stretch' },
  cardInner: { flex: 1, padding: 14, gap: 3 },
  cardMeta: { fontFamily: MONO, color: D2.textMute, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.2 },
  cardName: { color: D2.text, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  cardDate: { fontFamily: MONO, color: D2.accent, fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },

  // Multi-event bottom card
  multiCard: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: D2.surface, borderRadius: 12,
    borderWidth: 1, borderColor: D2.strokeHi,
    maxHeight: 280, overflow: 'hidden', ...SHADOW,
  },
  multiTitle: { fontFamily: MONO, color: D2.textMute, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.2, padding: 14, paddingBottom: 10 },
  multiList: { flexGrow: 0 },
  multiRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: D2.stroke, overflow: 'hidden' },
  multiStrip: { width: 3, alignSelf: 'stretch' },
  multiRowInner: { flex: 1, padding: 12, gap: 3 },
  multiMeta: { fontFamily: MONO, color: D2.textMute, fontSize: 9, fontWeight: '600', letterSpacing: 1 },
  multiName: { color: D2.text, fontSize: 13, fontWeight: '600' },
});
