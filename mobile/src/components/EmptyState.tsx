import { View, Text, StyleSheet } from 'react-native';
import { D2, MONO } from '@/constants/design';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <View style={s.container}>
      {icon && <Text style={s.icon}>{icon}</Text>}
      <Text style={s.title}>{title.toUpperCase()}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  icon:     { fontSize: 40, marginBottom: 4 },
  title:    { fontFamily: MONO, color: D2.textMute, fontSize: 13, fontWeight: '600', textAlign: 'center', letterSpacing: 1.2 },
  subtitle: { color: D2.textFaint, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
