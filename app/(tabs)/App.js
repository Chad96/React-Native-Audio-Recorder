import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import RecordingsScreen from './RecordingsScreen';
import { openDB } from 'idb';
import { Feather } from '@expo/vector-icons';

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
  const [isRecording, setIsRecording] = useState(false);
  const waveAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [isRecording]);

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation, {
          toValue: 1.5,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopWaveAnimation = () => {
    waveAnimation.stopAnimation();
    waveAnimation.setValue(1); // Reset the animation scale
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
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
      setIsRecording(false);

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
        style={[styles.recordButton, isRecording && styles.recording]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Feather name={isRecording ? 'stop-circle' : 'mic'} size={28} color="#fff" />
        <Text style={styles.buttonText}>{isRecording ? 'Stop Recording' : 'Start Recording'}</Text>
      </TouchableOpacity>
      {isRecording && (
        <Animated.View style={[styles.waves, { transform: [{ scale: waveAnimation }] }]}>
          <View style={styles.wave} />
          <View style={[styles.wave, styles.wave2]} />
          <View style={[styles.wave, styles.wave3]} />
        </Animated.View>
      )}
      <RecordingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066cc',
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 15,
  },
  recording: { backgroundColor: '#ff4d4d' },
  buttonText: { color: '#fff', fontSize: 18, marginLeft: 10 },
  waves: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60, // Center horizontally
    borderRadius: 60,
  },
  wave: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 77, 77, 0.6)',
  },
  wave2: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 77, 77, 0.4)',
  },
  wave3: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 77, 77, 0.2)',
  },
});
