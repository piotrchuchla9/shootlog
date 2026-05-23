import {
  View, Text, TextInput, Switch, ScrollView,
  Pressable, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { toastSuccess, toastError } from '@/lib/toast';
import { D2, MONO } from '@/constants/design';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name:           user?.name          ?? '',
    shooterAlias:   user?.shooterAlias  ?? '',
    ipscNumber:     user?.ipscNumber    ?? '',
    pzssNumber:     user?.pzssNumber    ?? '',
    region:         user?.region        ?? '',
    notifySignup:   user?.notifySignup  ?? true,
    notifyResults:  user?.notifyResults ?? true,
  });

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Błąd', 'Imię i nazwisko są wymagane');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me', {
        name:           form.name.trim(),
        shooterAlias:   form.shooterAlias.trim()  || undefined,
        ipscNumber:     form.ipscNumber.trim()    || undefined,
        pzssNumber:     form.pzssNumber.trim()    || undefined,
        region:         form.region.trim()        || undefined,
        notifySignup:   form.notifySignup,
        notifyResults:  form.notifyResults,
      });
      updateUser(data);
      toastSuccess('Profil zaktualizowany');
      router.back();
    } catch {
      toastError('Nie udało się zapisać. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          <Section label="DANE OSOBOWE">
            <Field label="IMIĘ I NAZWISKO">
              <TextInput
                style={s.input}
                value={form.name}
                onChangeText={v => set('name', v)}
                placeholderTextColor={D2.textFaint}
                placeholder="Jan Kowalski"
                selectionColor={D2.accent}
              />
            </Field>
            <Field label="PSEUDONIM STRZELECKI">
              <TextInput
                style={s.input}
                value={form.shooterAlias}
                onChangeText={v => set('shooterAlias', v)}
                placeholderTextColor={D2.textFaint}
                placeholder="np. Hawk"
                autoCapitalize="none"
                selectionColor={D2.accent}
              />
            </Field>
          </Section>

          <Section label="LICENCJE">
            <Field label="NUMER IPSC">
              <TextInput
                style={s.input}
                value={form.ipscNumber}
                onChangeText={v => set('ipscNumber', v)}
                placeholderTextColor={D2.textFaint}
                placeholder="PL-XXXX"
                autoCapitalize="characters"
                selectionColor={D2.accent}
              />
            </Field>
            <Field label="NUMER PZSS">
              <TextInput
                style={s.input}
                value={form.pzssNumber}
                onChangeText={v => set('pzssNumber', v)}
                placeholderTextColor={D2.textFaint}
                placeholder="np. 12345"
                keyboardType="numeric"
                selectionColor={D2.accent}
              />
            </Field>
            <Field label="REGION / WOJEWÓDZTWO">
              <TextInput
                style={s.input}
                value={form.region}
                onChangeText={v => set('region', v)}
                placeholderTextColor={D2.textFaint}
                placeholder="np. mazowieckie"
                selectionColor={D2.accent}
              />
            </Field>
          </Section>

          <Section label="POWIADOMIENIA">
            <Toggle
              label="Otwarte zapisy"
              sub="GDY OTWORZĄ SIĘ ZAPISY NA ZAWODY"
              value={form.notifySignup}
              onValueChange={v => set('notifySignup', v)}
            />
            <Toggle
              label="Wyniki zawodów"
              sub="GDY POJAWIĄ SIĘ WYNIKI ZAWODÓW"
              value={form.notifyResults}
              onValueChange={v => set('notifyResults', v)}
              last
            />
          </Section>

          <Pressable
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color={D2.bg} />
              : <Text style={s.saveBtnText}>ZAPISZ ZMIANY</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({ label, sub, value, onValueChange, last }: {
  label: string; sub: string; value: boolean; onValueChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[s.toggleRow, !last && s.toggleBorder]}>
      <View style={s.toggleLabel}>
        <Text style={s.toggleTitle}>{label}</Text>
        <Text style={s.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: D2.accent, false: D2.surfaceHi }}
        thumbColor={value ? D2.bg : D2.textMute}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: D2.bg },
  content:   { padding: 20, gap: 20, paddingBottom: 40 },

  section:       { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionLabel:  { fontFamily: MONO, fontSize: 10, color: D2.accent, letterSpacing: 1.2 },
  sectionLine:   { flex: 1, height: 1, backgroundColor: D2.stroke },
  sectionCard:   { backgroundColor: D2.surface, borderRadius: 10, borderWidth: 1, borderColor: D2.stroke, overflow: 'hidden' },

  field:      { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: D2.stroke },
  fieldLabel: { fontFamily: MONO, fontSize: 9.5, color: D2.textMute, letterSpacing: 1.2, marginBottom: 5 },
  input:      { color: D2.text, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },

  toggleRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  toggleBorder: { borderBottomWidth: 1, borderBottomColor: D2.stroke },
  toggleLabel:  { flex: 1 },
  toggleTitle:  { color: D2.text, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  toggleSub:    { fontFamily: MONO, fontSize: 9.5, color: D2.textSub, marginTop: 3, letterSpacing: 0.4 },

  saveBtn:         { backgroundColor: D2.accent, borderRadius: 10, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { fontFamily: MONO, color: D2.bg, fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
});
