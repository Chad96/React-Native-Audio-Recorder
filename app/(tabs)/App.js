import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import RecordingsScreen from './RecordingsScreen';
import { openDB } from 'idb';

let dbPromise;
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  dbPromise = openDB('voice-notes', 1, {
    upgrade(db) {
      db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
    },
  });
}

async function saveToIndexedDB(name, blob) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.add('notes', { name, blob, date: new Date() });
}

export default function App() {
  const [recording, setRecording] = useState(null);
  const [recordingName, setRecordingName] = useState('');

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
        setRecording(recording);
      } else {
        alert('Microphone permission is required to record audio');
      }
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (Platform.OS !== 'web') {
        const filename = `${recordingName || 'VoiceNote'}_${Date.now()}.m4a`;
        await FileSystem.moveAsync({ from: uri, to: FileSystem.documentDirectory + filename });
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();
        await saveToIndexedDB(recordingName || `VoiceNote_${Date.now()}`, blob);
        alert('Recording saved in IndexedDB.');
      }
    } catch (error) {
      console.error('Error stopping recording', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Recorder App</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Recording Name"
        onChangeText={setRecordingName}
        value={recordingName}
      />
      <TouchableOpacity style={styles.recordButton} onPress={recording ? stopRecording : startRecording}>
        <Text style={styles.buttonText}>{recording ? 'Stop Recording' : 'Start Recording'}</Text>
      </TouchableOpacity>
      <RecordingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  input: { borderBottomWidth: 1, marginBottom: 15, paddingHorizontal: 8, paddingVertical: 5 },
  recordButton: { backgroundColor: '#0066cc', padding: 15, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18 },
});
