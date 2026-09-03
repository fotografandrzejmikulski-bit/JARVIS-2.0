import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import { transcribe } from '../lib/api';

export function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);

  useEffect(() => () => { recorder.stop().catch(() => undefined); }, [recorder]);

  async function toggle() {
    if (!recording) {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) return;
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      return;
    }
    await recorder.stop();
    setRecording(false);
    if (recorder.uri) {
      const result = await transcribe(recorder.uri);
      if (result?.text) onText(result.text);
    }
  }

  return <Pressable style={[styles.button, recording && styles.active]} onPress={toggle}>
    <Text style={styles.text}>{recording ? 'STOP & TRANSCRIBE' : 'VOICE COMMAND'}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderColor: '#4b5a69', padding: 16, alignItems: 'center' },
  active: { borderColor: '#d9a441' },
  text: { color: '#f4f7fb', fontWeight: '700', letterSpacing: 1.2 }
});
