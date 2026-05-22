import { ScrollView, Text, View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    title: 'Administrator danych',
    body: 'Administratorem danych osobowych jest właściciel aplikacji ShootLog. Kontakt: piotrchuchla9@gmail.com',
  },
  {
    title: 'Jakie dane zbieramy',
    body: 'Adres e-mail oraz imię (przy logowaniu przez Google lub Apple). Opcjonalnie: token powiadomień push (jeśli włączysz powiadomienia). Dane lokalizacyjne są przetwarzane wyłącznie na urządzeniu — nie są wysyłane na serwer.',
  },
  {
    title: 'W jakim celu',
    body: 'Dane konta służą do uwierzytelniania i personalizacji aplikacji. Token push umożliwia wysyłanie powiadomień o nowych zawodach zgodnych z Twoimi filtrami.',
  },
  {
    title: 'Podstawa prawna',
    body: 'Przetwarzanie danych odbywa się na podstawie Twojej zgody (art. 6 ust. 1 lit. a RODO) wyrażonej przy rejestracji lub włączeniu powiadomień.',
  },
  {
    title: 'Przechowywanie danych',
    body: 'Dane przechowujemy tak długo, jak utrzymujesz konto. Po usunięciu konta dane są trwale usuwane w ciągu 30 dni.',
  },
  {
    title: 'Udostępnianie danych',
    body: 'Nie sprzedajemy ani nie udostępniamy danych osobowych podmiotom trzecim w celach marketingowych. Korzystamy z usług Sentry do monitorowania błędów (dane anonimowe).',
  },
  {
    title: 'Twoje prawa',
    body: 'Masz prawo do dostępu, sprostowania, usunięcia danych, ograniczenia przetwarzania oraz przenoszenia danych. Możesz je realizować przez ustawienia konta lub kontakt e-mail.',
  },
  {
    title: 'Pliki cookie / identyfikatory',
    body: 'Aplikacja mobilna nie używa plików cookie. Używamy bezpiecznego lokalnego magazynu (expo-secure-store) do przechowywania tokenu sesji.',
  },
  {
    title: 'Zmiany polityki',
    body: 'O istotnych zmianach poinformujemy w aplikacji. Data ostatniej aktualizacji: 22 maja 2026 r.',
  },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={s.title}>Polityka prywatności</Text>
        <View style={s.back} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Niniejsza polityka prywatności opisuje, jak ShootLog przetwarza dane osobowe użytkowników aplikacji mobilnej.
        </Text>
        {SECTIONS.map((sec) => (
          <View key={sec.title} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <Text style={s.sectionBody}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 17, fontWeight: '700' },
  content: { padding: 20, gap: 20 },
  intro: { color: '#AAA', fontSize: 14, lineHeight: 22 },
  section: { gap: 6 },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  sectionBody: { color: '#AAA', fontSize: 14, lineHeight: 22 },
});
