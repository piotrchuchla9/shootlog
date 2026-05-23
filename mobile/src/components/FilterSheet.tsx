import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { DISCIPLINE_OPTIONS, DISCIPLINE_COLORS } from '@/constants/disciplines';
import { VOIVODESHIP_LABELS } from '@/constants/locations';
import { useLocations } from '@/hooks/useLocations';
import { D2, MONO } from '@/constants/design';

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
  { value: null,  label: 'Wszystkie' },
  { value: 1,     label: 'L1 — Klub' },
  { value: 2,     label: 'L2 — Regionalny' },
  { value: 3,     label: 'L3 — Krajowy' },
  { value: 4,     label: 'L4 — Kontynentalny' },
  { value: 5,     label: 'L5 — Światowy' },
];

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Nadchodzące' },
  { value: 'finished', label: 'Zakończone' },
  { value: '',         label: 'Wszystkie' },
];

export function FilterSheet({ visible, filters, onApply, onClose }: Props) {
  const [local, setLocal] = useState<FilterState>(filters);

  useEffect(() => { if (visible) setLocal(filters); }, [visible]);

  const { data: allLocs,    isLoading: loadingVoiv  } = useLocations();
  const { data: scopedLocs, isLoading: loadingCities } = useLocations(local.region || undefined);

  const voivodeships = allLocs?.voivodeships ?? [];
  const cities       = scopedLocs?.cities ?? [];

  function setRegion(region: string) {
    setLocal(f => ({ ...f, region, city: region !== f.region ? '' : f.city }));
  }

  const totalActive = [local.discipline, local.level, local.status !== 'upcoming' ? local.status : '', local.region, local.city].filter(Boolean).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />

        <View style={s.titleRow}>
          <View>
            <Text style={s.eyebrow}>{totalActive > 0 ? `${totalActive} FILTRÓW AKTYWNYCH` : 'FILTRY'}</Text>
            <Text style={s.title}>Filtry</Text>
          </View>
          <Pressable onPress={() => setLocal({ discipline: '', level: null, status: 'upcoming', region: '', city: '' })}>
            <Text style={s.resetLink}>RESETUJ</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Section label="DYSCYPLINA">
            {DISCIPLINE_OPTIONS.map(o => (
              <Chip
                key={o.value}
                label={o.label}
                active={local.discipline === o.value}
                accentColor={o.value ? DISCIPLINE_COLORS[o.value] : D2.accent}
                onPress={() => setLocal(f => ({ ...f, discipline: o.value }))}
              />
            ))}
          </Section>

          <Section label="POZIOM">
            {LEVEL_OPTIONS.map(o => (
              <Chip
                key={String(o.value)}
                label={o.label}
                active={local.level === o.value}
                onPress={() => setLocal(f => ({ ...f, level: o.value }))}
              />
            ))}
          </Section>

          <Section label="STATUS">
            {STATUS_OPTIONS.map(o => (
              <Chip
                key={o.value}
                label={o.label}
                active={local.status === o.value}
                onPress={() => setLocal(f => ({ ...f, status: o.value }))}
              />
            ))}
          </Section>

          <Section label="WOJEWÓDZTWO">
            {loadingVoiv ? (
              <ActivityIndicator color={D2.accent} style={{ marginVertical: 8 }} />
            ) : voivodeships.length === 0 ? (
              <Text style={s.emptyHint}>Brak danych</Text>
            ) : (
              <>
                <Chip label="Wszystkie" active={local.region === ''} onPress={() => setRegion('')} />
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

          {local.region !== '' && (
            <Section label="MIASTO">
              {loadingCities ? (
                <ActivityIndicator color={D2.accent} style={{ marginVertical: 8 }} />
              ) : cities.length === 0 ? (
                <Text style={s.emptyHint}>Brak miast</Text>
              ) : (
                <>
                  <Chip label="Wszystkie" active={local.city === ''} onPress={() => setLocal(f => ({ ...f, city: '' }))} />
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
          )}

          <View style={{ height: 8 }} />
        </ScrollView>

        <View style={s.actions}>
          <Pressable
            style={s.btnReset}
            onPress={() => setLocal({ discipline: '', level: null, status: 'upcoming', region: '', city: '' })}>
            <Text style={s.btnResetText}>RESETUJ</Text>
          </Pressable>
          <Pressable style={s.btnApply} onPress={() => { onApply(local); onClose(); }}>
            <Text style={s.btnApplyText}>ZASTOSUJ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>{label}</Text>
        <View style={s.sectionLine} />
      </View>
      <View style={s.chips}>{children}</View>
    </View>
  );
}

function Chip({ label, active, accentColor, onPress }: {
  label: string; active: boolean; accentColor?: string; onPress: () => void;
}) {
  const color = active ? (accentColor ?? D2.accent) : undefined;
  return (
    <Pressable
      style={[s.chip, active && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress}>
      <Text style={[s.chipText, active && { color }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: D2.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: D2.strokeHi,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: D2.strokeHi, alignSelf: 'center', marginVertical: 12,
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  eyebrow: { fontFamily: MONO, fontSize: 10, color: D2.accent, letterSpacing: 1.2, marginBottom: 4 },
  title:   { color: D2.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  resetLink: { fontFamily: MONO, fontSize: 10, color: D2.accent, fontWeight: '700', letterSpacing: 1.4, paddingBottom: 4 },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionLabel: { fontFamily: MONO, fontSize: 10, color: D2.accent, letterSpacing: 1.2 },
  sectionLine:  { flex: 1, height: 1, backgroundColor: D2.stroke },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emptyHint: { color: D2.textMute, fontSize: 13, fontStyle: 'italic' },

  chip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 6,
    borderWidth: 1, borderColor: D2.strokeHi, backgroundColor: 'transparent',
  },
  chipText: {
    fontFamily: MONO, fontSize: 10.5, color: D2.textSub,
    fontWeight: '600', letterSpacing: 0.6,
  },

  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 8 },
  btnReset: {
    flex: 1, paddingVertical: 14, borderRadius: 8,
    borderWidth: 1, borderColor: D2.strokeHi, alignItems: 'center',
  },
  btnResetText: { fontFamily: MONO, fontSize: 11, color: D2.text, fontWeight: '700', letterSpacing: 1.4 },
  btnApply: {
    flex: 2, paddingVertical: 14, borderRadius: 8,
    backgroundColor: D2.accent, alignItems: 'center',
  },
  btnApplyText: { fontFamily: MONO, fontSize: 11, color: D2.bg, fontWeight: '700', letterSpacing: 1.4 },
});
