import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    const trimmedEmail = email.trim()
    const trimmedName = displayName.trim()
    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Virhe', 'Täytä kaikki kentät')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Virhe', 'Salasanat eivät täsmää')
      return
    }
    if (password.length < 8) {
      Alert.alert('Virhe', 'Salasanan on oltava vähintään 8 merkkiä')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { display_name: trimmedName },
      },
    })
    setLoading(false)
    if (error) {
      Alert.alert('Rekisteröityminen epäonnistui', error.message)
    } else if (data.session) {
      router.replace('/(tabs)/sightings')
    } else {
      Alert.alert('Tarkista sähköpostisi', 'Lähetimme sinulle vahvistuslinkin. Vahvista sähköpostiosoitteesi ennen kirjautumista.')
      router.replace('/(auth)/login')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🐦</Text>
        <Text style={styles.title}>Luo tili</Text>
        <Text style={styles.subtitle}>Aloita lintujen kirjaaminen</Text>

        <TextInput
          style={styles.input}
          placeholder="Näyttönimi"
          placeholderTextColor="#9ca3af"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          accessibilityLabel="Näyttönimi"
        />
        <TextInput
          style={styles.input}
          placeholder="Sähköposti"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Sähköpostiosoite"
        />
        <TextInput
          style={styles.input}
          placeholder="Salasana"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Salasana"
        />
        <TextInput
          style={styles.input}
          placeholder="Vahvista salasana"
          placeholderTextColor="#9ca3af"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          accessibilityLabel="Vahvista salasana"
        />

        <Text style={styles.hint}>Salasanan on oltava vähintään 8 merkkiä</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Luo tili"
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Luo tili</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="button"
          accessibilityLabel="Siirry kirjautumiseen"
        >
          <Text style={styles.link}>
            Onko sinulla jo tili? <Text style={styles.linkBold}>Kirjaudu</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 60 },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 8, marginTop: -4 },
  button: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#6b7280', fontSize: 14 },
  linkBold: { color: '#16a34a', fontWeight: '600' },
})