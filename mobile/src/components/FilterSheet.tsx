import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { DISCIPLINE_OPTIONS } from '@/constants/disciplines';
import { VOIVODESHIP_LABELS } from '@/constants/locations';
import { useLocations } from '@/hooks/useLocations';

export interface FilterState {
  discipline: string;
  level: number | null;
  status: string;
  region: string;
  city: string;
}

interface Props {
  visible: boolean;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}

const LEVEL_OPTIONS = [
  { value: null, label: 'Wszystkie' },
  { value: 1, label: 'L1 — Klub' },
  { value: 2, label: 'L2 — Regionalny' },
  { value: 3, label: 'L3 — Krajowy' },
  { value: 4, label: 'L4 — Kontynentalny' },
  { value: 5, label: 'L5 — Światowy' },
];

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Nadchodzące' },
  { value: 'finished', label: 'Zakończone' },
  { value: '', label: 'Wszystkie' },
];

export function FilterSheet({ visible, filters, onApply, onClose }: Props) {
  const [local, setLocal] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible, filters]);

  // Fetch voivodeships (always all)
  const { data: allLocs, isLoading: loadingVoiv } = useLocations();
  // Fetch cities — scoped to selected voivodeship if one is picked
  const { data: scopedLocs, isLoading: loadingCities } = useLocations(local.region || undefined);

  const voivodeships = allLocs?.voivodeships ?? [];
  const cities = scopedLocs?.cities ?? [];

  function setRegion(region: string) {
    // reset city when voivodeship changes
    setLocal(f => ({ ...f, region, city: region !== f.region ? '' : f.city }));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Filtry</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Section label="Dyscyplina">
            {DISCIPLINE_OPTIONS.map(o => (
              <Chip
                key={o.value}
                label={o.label}
                active={local.discipline === o.value}
                onPress={() => setLocal(f => ({ ...f, discipline: o.value }))}
              />
            ))}
          </Section>

          <Section label="Poziom">
            {LEVEL_OPTIONS.map(o => (
              <Chip
                key={String(o.value)}
                label={o.label}
                active={local.level === o.value}
                onPress={() => setLocal(f => ({ ...f, level: o.value }))}
              />
            ))}
          </Section>

          <Section label="Status">
            {STATUS_OPTIONS.map(o => (
              <Chip
                key={o.value}
                label={o.label}
                active={local.status === o.value}
                onPress={() => setLocal(f => ({ ...f, status: o.value }))}
              />
            ))}
          </Section>

          <Section label="Województwo">
            {loadingVoiv ? (
              <ActivityIndicator color="#E87722" style={{ marginVertical: 8 }} />
            ) : voivodeships.length === 0 ? (
              <Text style={styles.emptyHint}>Brak danych</Text>
            ) : (
              <>
                <Chip
                  label="Wszystkie"
                  active={local.region === ''}
                  onPress={() => setRegion('')}
                />
                {voivodeships.map(v => (
                  <Chip
                    key={v}
                    label={VOIVODESHIP_LABELS[v] ?? v}
                    active={local.region === v}
                    onPress={() => setRegion(local.region === v ? '' : v)}
                  />
                ))}
              </>
            )}
          </Section>

          <Section label="Miasto">
            {loadingCities ? (
              <ActivityIndicator color="#E87722" style={{ marginVertical: 8 }} />
            ) : cities.length === 0 ? (
              <Text style={styles.emptyHint}>
                {local.region ? 'Brak miast dla tego województwa' : 'Brak danych'}
              </Text>
            ) : (
              <>
                <Chip
                  label="Wszystkie"
                  active={local.city === ''}
                  onPress={() => setLocal(f => ({ ...f, city: '' }))}
                />
                {cities.map(c => (
                  <Chip
                    key={c}
                    label={c}
                    active={local.city === c}
                    onPress={() => setLocal(f => ({ ...f, city: local.city === c ? '' : c }))}
                  />
                ))}
              </>
            )}
          </Section>

          <View style={{ height: 8 }} />
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={styles.btnReset}
            onPress={() => setLocal({ discipline: '', level: null, status: 'upcoming', region: '', city: '' })}>
            <Text style={styles.btnResetText}>Resetuj</Text>
          </Pressable>
          <Pressable style={styles.btnApply} onPress={() => { onApply(local); onClose(); }}>
            <Text style={styles.btnApplyText}>Zastosuj</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginVertical: 12 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '700', paddingHorizontal: 20, paddingBottom: 12 },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyHint: { color: '#555', fontSize: 13, fontStyle: 'italic' },

  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#111' },
  chipActive: { backgroundColor: '#E87722', borderColor: '#E87722' },
  chipText: { color: '#888', fontSize: 13 },
  chipTextActive: { color: '#FFF', fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8 },
  btnReset: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  btnResetText: { color: '#888', fontSize: 15 },
  btnApply: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: '#E87722', alignItems: 'center' },
  btnApplyText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
