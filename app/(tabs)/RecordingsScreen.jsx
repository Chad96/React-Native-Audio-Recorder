import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Platform, TextInput, Alert } from 'react-native';
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

async function deleteFromIndexedDB(id) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('notes', id);
}

export default function RecordingsScreen() {
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVoiceNotes();
    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, []);

  const loadVoiceNotes = async () => {
    try {
      if (Platform.OS !== 'web') {
        const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
        const notes = files.map(file => ({
          name: file,
          uri: `${FileSystem.documentDirectory}${file}`,
        }));
        console.log("Native voice notes:", notes); // Debug
        setVoiceNotes(notes);
      } else {
        const notes = await getNotesFromIndexedDB();
        console.log("Web voice notes from IndexedDB:", notes); // Debug
        setVoiceNotes(notes);
      }
    } catch (error) {
      console.error("Error loading voice notes:", error);
    }
  };

  const playRecording = async (note) => {
    if (isPlaying && currentSound) {
      await currentSound.stopAsync();
      setIsPlaying(false);
    }

    try {
      let sound;
      if (Platform.OS !== 'web') {
        const { sound: nativeSound } = await Audio.Sound.createAsync({ uri: note.uri });
        sound = nativeSound;
      } else {
        const objectURL = URL.createObjectURL(note.blob);
        const { sound: webSound } = await Audio.Sound.createAsync({ uri: objectURL });
        sound = webSound;
      }

      setCurrentSound(sound);
      setIsPlaying(true);
      sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isPlaying) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio', error);
    }
  };

  const deleteRecording = async (note) => {
    try {
      if (Platform.OS !== 'web') {
        console.log(`Attempting to delete file: ${note.uri}`);
        const fileExists = await FileSystem.getInfoAsync(note.uri);
        if (fileExists.exists) {
          await FileSystem.deleteAsync(note.uri);
          console.log(`File ${note.uri} deleted`);
        } else {
          console.warn(`File ${note.uri} not found`);
        }
      } else {
        console.log(`Attempting to delete IndexedDB entry with id: ${note.id}`);
        await deleteFromIndexedDB(note.id);
        console.log(`IndexedDB entry with id ${note.id} deleted`);
      }
      setVoiceNotes(prevNotes => prevNotes.filter(item => item.name !== note.name));
    } catch (error) {
      console.error('Error deleting recording', error);
    }
  };

  const confirmDelete = (note) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => deleteRecording(note) },
      ],
      { cancelable: true }
    );
  };

  const filteredNotes = voiceNotes.filter(note =>
    (note.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Notes</Text>
      <TextInput
        style={styles.input}
        placeholder="Search by name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={filteredNotes}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.voiceNote}>
            <Text style={styles.noteText}>{item.name}</Text>
            <Button title="Play" onPress={() => playRecording(item)} />
            <Button title="Delete" color="red" onPress={() => confirmDelete(item)} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  input: { borderBottomWidth: 1, marginBottom: 15, paddingHorizontal: 8, paddingVertical: 5 },
  voiceNote: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  noteText: { flex: 1, marginRight: 10 },
});
