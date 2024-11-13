import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { openDB } from 'idb';

let dbPromise;

if (typeof window !== 'undefined' && 'indexedDB' in window) {
  dbPromise = openDB('voice-notes', 1);
}

async function getNotesFromIndexedDB() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return await db.getAll('notes');
}

export default function RecordingsScreen() {
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);

  useEffect(() => {
    loadVoiceNotes();
    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, []);

  const loadVoiceNotes = async () => {
    if (Platform.OS !== 'web') {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      setVoiceNotes(files);
    } else {
      const notes = await getNotesFromIndexedDB();
      setVoiceNotes(notes);
    }
  };

  const playRecording = async (note) => {
    if (isPlaying) {
      await currentSound.stopAsync();
      setIsPlaying(false);
    }

    try {
      let sound;
      if (Platform.OS !== 'web') {
        const { sound: nativeSound } = await Audio.Sound.createAsync(
          { uri: FileSystem.documentDirectory + note },
          { shouldPlay: true }
        );
        sound = nativeSound;
      } else {
        const objectURL = URL.createObjectURL(note.blob);
        const { sound: webSound } = await Audio.Sound.createAsync({ uri: objectURL });
        sound = webSound;
      }

      setCurrentSound(sound);
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isPlaying) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Notes</Text>
      <FlatList
        data={voiceNotes}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.voiceNote}>
            <Text style={styles.noteText}>{Platform.OS !== 'web' ? item : `Note ${item.id}`}</Text>
            <Button title="Play" onPress={() => playRecording(item)} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  voiceNote: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  noteText: { flex: 1, marginRight: 10 },
});
