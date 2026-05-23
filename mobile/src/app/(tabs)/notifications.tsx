import {
  View, Text, Pressable, ScrollView,
  StyleSheet, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toastSuccess, toastError } from '@/lib/toast';
import { D2, MONO } from '@/constants/design';
import { DISCIPLINE_COLORS } from '@/constants/disciplines';

const DISCIPLINES = [
  { id: 'pistol',  label: 'Pistolet' },
  { id: 'rifle',   label: 'Karabin' },
  { id: 'shotgun', label: 'Strzelba' },
  { id: 'pcc',     label: 'PCC' },
  { id: 'air',     label: 'Action Air' },
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

type Prefs = { enabled: boolean; disciplines: string[]; levels: number[]; voivodeships: string[] };

export default function NotificationsTab() {
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [prefs,   setPrefs]   = useState<Prefs>({ enabled: true, disciplines: [], levels: [], voivodeships: [] });

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
      disciplines: p.disciplines.includes(id) ? p.disciplines.filter(d => d !== id) : [...p.disciplines, id],
    }));
  }

  function toggleLevel(id: number) {
    setPrefs(p => ({
      ...p,
      levels: p.levels.includes(id) ? p.levels.filter(l => l !== id) : [...p.levels, id],
    }));
  }

  function toggleVoivodeship(v: string) {
    setPrefs(p => ({
      ...p,
      voivodeships: p.voivodeships.includes(v) ? p.voivodeships.filter(x => x !== v) : [...p.voivodeships, v],
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
        <Text style={s.eyebrow}>ALERTY · PUSH</Text>
        <Text style={s.title}>Powiadomienia</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={D2.accent} /></View>
      ) : !user ? (
        <View style={s.center}>
          <Text style={s.gateTitle}>ZALOGUJ SIĘ</Text>
          <Text style={s.gateSub}>Aby ustawić powiadomienia o nowych zawodach</Text>
          <Pressable style={s.loginBtn} onPress={() => router.push('/auth/login')}>
            <Text style={s.loginBtnText}>ZALOGUJ SIĘ</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Master toggle */}
          <Section label="NOWE ZAWODY">
            <View style={s.toggleRow}>
              <View style={s.toggleLabel}>
                <Text style={s.toggleTitle}>Włącz powiadomienia</Text>
                <Text style={s.toggleSub}>PUSH GDY POJAWIĄ SIĘ NOWE ZAWODY</Text>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={toggleEnabled}
                trackColor={{ true: D2.accent, false: D2.surfaceHi }}
                thumbColor={prefs.enabled ? D2.bg : D2.textMute}
              />
            </View>
            {prefs.enabled && (
              <Text style={s.hint}>// PUSTE = WSZYSTKIE. ZAZNACZ ABY FILTROWAĆ.</Text>
            )}
          </Section>

          {prefs.enabled && (
            <>
              <Section label="DYSCYPLINY">
                <View style={s.chips}>
                  {DISCIPLINES.map(d => (
                    <Chip
                      key={d.id}
                      label={d.label}
                      selected={prefs.disciplines.includes(d.id)}
                      accentColor={DISCIPLINE_COLORS[d.id]}
                      onPress={() => toggleDiscipline(d.id)}
                    />
                  ))}
                </View>
              </Section>

              <Section label="POZIOM">
                <View style={s.chips}>
                  {LEVELS.map(l => (
                    <Chip
                      key={l.id}
                      label={l.label}
                      selected={prefs.levels.includes(l.id)}
                      onPress={() => toggleLevel(l.id)}
                    />
                  ))}
                </View>
              </Section>

              <Section label="WOJEWÓDZTWA">
                <View style={s.chips}>
                  {VOIVODESHIPS.map(v => (
                    <Chip
                      key={v}
                      label={v}
                      selected={prefs.voivodeships.includes(v)}
                      onPress={() => toggleVoivodeship(v)}
                    />
                  ))}
                </View>
              </Section>
            </>
          )}

          <Pressable
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color={D2.bg} />
              : <Text style={s.saveBtnText}>ZAPISZ PREFERENCJE</Text>}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>{label}</Text>
        <View style={s.sectionLine} />
      </View>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

function Chip({ label, selected, accentColor, onPress }: {
  label: string; selected: boolean; accentColor?: string; onPress: () => void;
}) {
  const c = selected ? (accentColor ?? D2.accent) : undefined;
  return (
    <Pressable
      style={[s.chip, selected && { borderColor: c, backgroundColor: c + '18' }]}
      onPress={onPress}>
      <Text style={[s.chipText, selected && { color: c }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D2.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  content:   { paddingHorizontal: 20, paddingBottom: 40, gap: 0 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  eyebrow: { fontFamily: MONO, fontSize: 10, color: D2.textMute, letterSpacing: 1.2, marginBottom: 3 },
  title:   { color: D2.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.8, lineHeight: 34 },

  gateTitle: { fontFamily: MONO, fontSize: 14, color: D2.text, fontWeight: '700', letterSpacing: 1.2 },
  gateSub:   { color: D2.textSub, fontSize: 14, textAlign: 'center' },
  loginBtn:  { marginTop: 8, backgroundColor: D2.accent, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14 },
  loginBtnText: { fontFamily: MONO, color: D2.bg, fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },

  section:      { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionLabel:  { fontFamily: MONO, fontSize: 10, color: D2.accent, letterSpacing: 1.2 },
  sectionLine:   { flex: 1, height: 1, backgroundColor: D2.stroke },
  sectionCard:   { gap: 0 },

  hint: { fontFamily: MONO, fontSize: 10, color: D2.textMute, marginTop: 10, letterSpacing: 0.4, lineHeight: 16 },

  toggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, backgroundColor: D2.surface, borderRadius: 10, borderWidth: 1, borderColor: D2.stroke },
  toggleLabel: { flex: 1 },
  toggleTitle: { color: D2.text, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  toggleSub:   { fontFamily: MONO, fontSize: 9.5, color: D2.textSub, marginTop: 3, letterSpacing: 0.4 },

  chips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:     { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: D2.strokeHi },
  chipText: { fontFamily: MONO, fontSize: 10.5, color: D2.textSub, fontWeight: '600', letterSpacing: 0.6 },

  saveBtn:         { backgroundColor: D2.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { fontFamily: MONO, color: D2.bg, fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
});
