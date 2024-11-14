import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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

async function saveToIndexedDB(blob) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.add('notes', { blob, date: new Date() });
}

export default function App() {
  const [recording, setRecording] = useState(null);

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
        const filename = `VoiceNote_${Date.now()}.m4a`;
        await FileSystem.moveAsync({ from: uri, to: FileSystem.documentDirectory + filename });
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();
        await saveToIndexedDB(blob);
        alert('Recording saved in IndexedDB.');
      }
    } catch (error) {
      console.error('Error stopping recording', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Recorder</Text>
      <TouchableOpacity
        style={styles.recordButton}
        onPress={recording ? stopRecording : startRecording}
      >
        <Text style={styles.buttonText}>{recording ? 'Stop Recording' : 'Start Recording'}</Text>
      </TouchableOpacity>
      <RecordingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  recordButton: { backgroundColor: '#0066cc', padding: 15, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18 },
});
