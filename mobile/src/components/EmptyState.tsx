import { View, Text, StyleSheet } from 'react-native';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = '🎯', title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  icon: { fontSize: 48 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  subtitle: { color: '#888888', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
