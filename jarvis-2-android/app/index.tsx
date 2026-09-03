import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { api, type Health } from '../lib/api';

export default function CommandCenter() {
  const [health, setHealth] = useState<Health | null>(null);
  const [message, setMessage] = useState('JARVIS 2.0 — online interface');

  useEffect(() => {
    api.health().then(setHealth).catch(() => setMessage('Backend offline — configure API URL.'));
  }, []);

  const speak = () => Speech.speak(message, { language: 'en-US', rate: 0.95 });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.kicker}>COMMAND CENTER</Text>
        <Text style={styles.title}>JARVIS 2.0</Text>
        <Text style={styles.status}>{health ? 'SYSTEM ONLINE' : 'CONNECTING'}</Text>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>CORE STATUS</Text>
          <Text style={styles.line}>API: {health ? 'reachable' : 'pending'}</Text>
          <Text style={styles.line}>Runtime: Android / Expo</Text>
          <Text style={styles.line}>Mode: authenticated backend</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
        <Pressable style={styles.button} onPress={speak}>
          <Text style={styles.buttonText}>VOICE OUTPUT</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#05070a' },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  kicker: { color: '#7e8b9a', letterSpacing: 3, fontSize: 12 },
  title: { color: '#f4f7fb', fontSize: 42, fontWeight: '700' },
  status: { color: '#75d7a1', letterSpacing: 2, fontWeight: '600' },
  panel: { borderWidth: 1, borderColor: '#26313d', padding: 18, marginTop: 12 },
  panelTitle: { color: '#cbd5e1', fontWeight: '700', marginBottom: 10 },
  line: { color: '#8e9baa', marginTop: 6 },
  message: { color: '#dce4ed', fontSize: 16, lineHeight: 24, marginTop: 10 },
  button: { marginTop: 10, borderWidth: 1, borderColor: '#4b5a69', padding: 16, alignItems: 'center' },
  buttonText: { color: '#f4f7fb', fontWeight: '700', letterSpacing: 1.5 }
});
