import { View, Text, StyleSheet } from 'react-native'

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.title}>Kartta tulossa pian</Text>
      <Text style={styles.body}>
        Kartta vaatii kehitysbuildin.{'\n'}
        Aja{' '}
        <Text style={styles.code}>npx expo run:android</Text>
        {' '}tai{' '}
        <Text style={styles.code}>npx expo run:ios</Text>
        {'\n'}käyttääksesi sitä.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  body: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  code: { fontFamily: 'monospace', color: '#16a34a' },
})
