import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Platform, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { openDB } from 'idb';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

const METADATA_FILE = `${FileSystem.documentDirectory}metadata.json`;

let dbPromise;
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  dbPromise = openDB('voice-notes', 1);
}

async function getNotesFromIndexedDB() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return await db.getAll('notes');
}

async function updateIndexedDBName(id, newName) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const note = await db.get('notes', id);
  if (note) {
    note.name = newName;
    await db.put('notes', note);
  }
}

async function loadMetadata() {
  try {
    const fileInfo = await FileSystem.getInfoAsync(METADATA_FILE);
    if (fileInfo.exists) {
      const metadata = await FileSystem.readAsStringAsync(METADATA_FILE);
      return JSON.parse(metadata);
    }
  } catch (error) {
    console.error('Error loading metadata:', error);
  }
  return {};
}

async function saveMetadata(metadata) {
  try {
    await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error saving metadata:', error);
  }
}

export default function RecordingsScreen() {
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [metadata, setMetadata] = useState({});

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
      let metadataObj = {};
      if (Platform.OS !== 'web') {
        metadataObj = await loadMetadata();
        setMetadata(metadataObj);

        const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
        const notes = files
          .filter(file => file !== 'metadata.json') // Exclude metadata file
          .map(file => ({
            id: file,
            name: metadataObj[file] || file,
            uri: `${FileSystem.documentDirectory}${file}`,
          }));
        setVoiceNotes(notes);
      } else {
        const notes = await getNotesFromIndexedDB();
        setVoiceNotes(notes);
      }
    } catch (error) {
      console.error('Error loading voice notes:', error);
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
        const fileExists = await FileSystem.getInfoAsync(note.uri);
        if (fileExists.exists) {
          await FileSystem.deleteAsync(note.uri);
        }
        const newMetadata = { ...metadata };
        delete newMetadata[note.id];
        setMetadata(newMetadata);
        saveMetadata(newMetadata);
      } else {
        await updateIndexedDBName(note.id, null); // Clear the note
      }
      setVoiceNotes(prevNotes => prevNotes.filter(item => item.id !== note.id));
    } catch (error) {
      console.error('Error deleting recording:', error);
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

  const saveRename = async (note, newName) => {
    try {
      if (Platform.OS !== 'web') {
        const newUri = `${FileSystem.documentDirectory}${newName}`;
        await FileSystem.moveAsync({ from: note.uri, to: newUri });

        const updatedMetadata = { ...metadata, [newName]: newName };
        setMetadata(updatedMetadata);
        await saveMetadata(updatedMetadata);

        setVoiceNotes(prevNotes =>
          prevNotes.map(item =>
            item.id === note.id ? { ...item, name: newName, uri: newUri, id: newName } : item
          )
        );
      } else {
        await updateIndexedDBName(note.id, newName);
        setVoiceNotes(prevNotes =>
          prevNotes.map(item =>
            item.id === note.id ? { ...item, name: newName } : item
          )
        );
      }
    } catch (error) {
      console.error('Error renaming file:', error);
    }
    setEditingNote(null);
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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {editingNote === item.id ? (
              <TextInput
                style={styles.input}
                placeholder="Rename note"
                defaultValue={item.name}
                onSubmitEditing={(e) => saveRename(item, e.nativeEvent.text)}
                onBlur={() => setEditingNote(null)}
                autoFocus
              />
            ) : (
              <Text style={styles.noteText}>{item.name}</Text>
            )}
            <View style={styles.iconContainer}>
              <TouchableOpacity onPress={() => playRecording(item)}>
                <AntDesign name="playcircleo" size={24} color="green" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingNote(item.id)}>
                <MaterialIcons name="edit" size={24} color="blue" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item)}>
                <AntDesign name="delete" size={24} color="red" />
              </TouchableOpacity>
            </View>
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
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
    elevation: 2,
  },
  noteText: { flex: 1, fontSize: 16, marginRight: 10 },
  iconContainer: { flexDirection: 'row', justifyContent: 'space-around', width: 100 },
});
