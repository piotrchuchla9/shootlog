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

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    shooterAlias: user?.shooterAlias ?? '',
    ipscNumber: user?.ipscNumber ?? '',
    pzssNumber: user?.pzssNumber ?? '',
    region: user?.region ?? '',
    notifySignup: user?.notifySignup ?? true,
    notifyResults: user?.notifyResults ?? true,
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
        name: form.name.trim(),
        shooterAlias: form.shooterAlias.trim() || undefined,
        ipscNumber: form.ipscNumber.trim() || undefined,
        pzssNumber: form.pzssNumber.trim() || undefined,
        region: form.region.trim() || undefined,
        notifySignup: form.notifySignup,
        notifyResults: form.notifyResults,
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
          <Section title="Dane osobowe">
            <Field label="Imię i nazwisko">
              <TextInput
                style={s.input}
                value={form.name}
                onChangeText={v => set('name', v)}
                placeholderTextColor="#555"
                placeholder="Jan Kowalski"
              />
            </Field>
            <Field label="Pseudonim strzelecki">
              <TextInput
                style={s.input}
                value={form.shooterAlias}
                onChangeText={v => set('shooterAlias', v)}
                placeholderTextColor="#555"
                placeholder="np. Hawk"
                autoCapitalize="none"
              />
            </Field>
          </Section>

          <Section title="Numery licencji">
            <Field label="Numer IPSC">
              <TextInput
                style={s.input}
                value={form.ipscNumber}
                onChangeText={v => set('ipscNumber', v)}
                placeholderTextColor="#555"
                placeholder="PL-XXXX"
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Numer PZSS">
              <TextInput
                style={s.input}
                value={form.pzssNumber}
                onChangeText={v => set('pzssNumber', v)}
                placeholderTextColor="#555"
                placeholder="np. 12345"
                keyboardType="numeric"
              />
            </Field>
            <Field label="Region / województwo">
              <TextInput
                style={s.input}
                value={form.region}
                onChangeText={v => set('region', v)}
                placeholderTextColor="#555"
                placeholder="np. mazowieckie"
              />
            </Field>
          </Section>

          <Section title="Powiadomienia">
            <View style={s.switchRow}>
              <View style={s.switchLabel}>
                <Text style={s.switchTitle}>Otwarte zapisy</Text>
                <Text style={s.switchSub}>Gdy otworzą się zapisy na zawody</Text>
              </View>
              <Switch
                value={form.notifySignup}
                onValueChange={v => set('notifySignup', v)}
                trackColor={{ true: '#E87722' }}
              />
            </View>
            <View style={[s.switchRow, { borderTopWidth: 1, borderTopColor: '#2A2A2A' }]}>
              <View style={s.switchLabel}>
                <Text style={s.switchTitle}>Wyniki zawodów</Text>
                <Text style={s.switchSub}>Gdy pojawią się wyniki zawodów</Text>
              </View>
              <Switch
                value={form.notifyResults}
                onValueChange={v => set('notifyResults', v)}
                trackColor={{ true: '#E87722' }}
              />
            </View>
          </Section>

          <Pressable
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.saveBtnText}>Zapisz zmiany</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode; }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 20, gap: 24, paddingBottom: 40 },

  section: { gap: 8 },
  sectionTitle: { color: '#666', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: '#1A1A1A', borderRadius: 14, overflow: 'hidden', gap: 0 },

  field: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  fieldLabel: { color: '#666', fontSize: 12, marginBottom: 6 },
  input: { color: '#FFF', fontSize: 16 },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  switchLabel: { flex: 1 },
  switchTitle: { color: '#CCC', fontSize: 15 },
  switchSub: { color: '#555', fontSize: 12, marginTop: 2 },

  saveBtn: { backgroundColor: '#E87722', borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
