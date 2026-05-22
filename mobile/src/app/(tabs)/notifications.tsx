import {
  View, Text, Switch, ScrollView, Pressable,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toastSuccess, toastError } from '@/lib/toast';

const DISCIPLINES = [
  { id: 'pistol', label: 'Pistolet' },
  { id: 'rifle', label: 'Karabin' },
  { id: 'shotgun', label: 'Strzelba' },
  { id: 'pcc', label: 'PCC' },
  { id: 'air', label: 'Action Air' },
];

const LEVELS = [
  { id: 1, label: 'L1 Klub' },
  { id: 2, label: 'L2 Regionalny' },
  { id: 3, label: 'L3 Krajowy' },
  { id: 4, label: 'L4 Między­nar.' },
  { id: 5, label: 'L5 Światowy' },
];

const VOIVODESHIPS = [
  'dolnośląskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie',
  'łódzkie', 'małopolskie', 'mazowieckie', 'opolskie',
  'podkarpackie', 'podlaskie', 'pomorskie', 'śląskie',
  'świętokrzyskie', 'warmińsko-mazurskie', 'wielkopolskie', 'zachodniopomorskie',
];

type Prefs = {
  enabled: boolean;
  disciplines: string[];
  levels: number[];
  voivodeships: string[];
};

export default function NotificationsTab() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    enabled: true,
    disciplines: [],
    levels: [],
    voivodeships: [],
  });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get<Prefs>('/user/notification-preferences')
      .then(r => setPrefs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  function toggleEnabled(v: boolean) { setPrefs(p => ({ ...p, enabled: v })); }

  function toggleDiscipline(id: string) {
    setPrefs(p => ({
      ...p,
      disciplines: p.disciplines.includes(id)
        ? p.disciplines.filter(d => d !== id)
        : [...p.disciplines, id],
    }));
  }

  function toggleLevel(id: number) {
    setPrefs(p => ({
      ...p,
      levels: p.levels.includes(id)
        ? p.levels.filter(l => l !== id)
        : [...p.levels, id],
    }));
  }

  function toggleVoivodeship(v: string) {
    setPrefs(p => ({
      ...p,
      voivodeships: p.voivodeships.includes(v)
        ? p.voivodeships.filter(x => x !== v)
        : [...p.voivodeships, v],
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/user/notification-preferences', prefs);
      toastSuccess('Preferencje zapisane');
    } catch {
      toastError('Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Powiadomienia</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#E87722" />
        </View>
      ) : !user ? (
        <View style={s.center}>
          <Text style={s.gateTitle}>Zaloguj się</Text>
          <Text style={s.gateSub}>Aby ustawić powiadomienia o nowych zawodach</Text>
          <Pressable style={s.loginBtn} onPress={() => router.push('/auth/login')}>
            <Text style={s.loginBtnText}>Zaloguj się</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <Section title="Powiadomienia o nowych zawodach">
            <View style={s.switchRow}>
              <View style={s.switchLabel}>
                <Text style={s.switchTitle}>Włącz powiadomienia</Text>
                <Text style={s.switchSub}>Push gdy pojawią się nowe zawody</Text>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={toggleEnabled}
                trackColor={{ true: '#E87722' }}
              />
            </View>
          </Section>

          {prefs.enabled && (
            <>
              <Text style={s.hint}>Puste = powiadamiaj o wszystkich. Zaznacz żeby filtrować.</Text>

              <Section title="Dyscypliny">
                <View style={s.chips}>
                  {DISCIPLINES.map(d => (
                    <Chip key={d.id} label={d.label} selected={prefs.disciplines.includes(d.id)} onPress={() => toggleDiscipline(d.id)} />
                  ))}
                </View>
              </Section>

              <Section title="Poziom zawodów">
                <View style={s.chips}>
                  {LEVELS.map(l => (
                    <Chip key={l.id} label={l.label} selected={prefs.levels.includes(l.id)} onPress={() => toggleLevel(l.id)} />
                  ))}
                </View>
              </Section>

              <Section title="Województwa">
                <View style={s.chips}>
                  {VOIVODESHIPS.map(v => (
                    <Chip key={v} label={v} selected={prefs.voivodeships.includes(v)} onPress={() => toggleVoivodeship(v)} />
                  ))}
                </View>
              </Section>
            </>
          )}

          <Pressable style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Zapisz</Text>}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, selected && s.chipSelected]}>
      <Text style={[s.chipText, selected && s.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  content: { padding: 20, gap: 20, paddingBottom: 40 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { color: '#FFF', fontSize: 28, fontWeight: '700' },

  gateTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  gateSub: { color: '#888', fontSize: 14, textAlign: 'center' },
  loginBtn: { marginTop: 8, backgroundColor: '#E87722', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  loginBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  section: { gap: 8 },
  sectionTitle: { color: '#666', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14 },

  hint: { color: '#555', fontSize: 13 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchLabel: { flex: 1 },
  switchTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  switchSub: { color: '#888', fontSize: 12, marginTop: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#3A3A3A' },
  chipSelected: { backgroundColor: '#E877221A', borderColor: '#E87722' },
  chipText: { color: '#888', fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#E87722' },

  saveBtn: { backgroundColor: '#E87722', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
