import { Image, StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Feather, MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroContainer}>
        <Image
          source={require('@/assets/images/mic.png')}
          style={styles.heroImage}
        />
        <ThemedText type="title" style={styles.heroTitle}>
          Welcome to Your Personal Voice Recorder!
        </ThemedText>
        <ThemedText type="default" style={styles.heroSubtitle}>
          Easily record, organize, and play back your voice notes.
        </ThemedText>
      </View>

      {/* Features Section */}
      <ThemedView style={styles.featuresContainer}>
        <ThemedText type="title" style={styles.sectionTitle}>
          App Features
        </ThemedText>
        <View style={styles.featureItem}>
          <Feather name="mic" size={30} color="#0066cc" />
          <ThemedText style={styles.featureText}>
            Record high-quality audio with just one tap.
          </ThemedText>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="playlist-play" size={30} color="#0066cc" />
          <ThemedText style={styles.featureText}>
            Organize and manage your recordings easily.
          </ThemedText>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="edit" size={30} color="#0066cc" />
          <ThemedText style={styles.featureText}>
            Rename and customize your voice notes.
          </ThemedText>
        </View>
        <View style={styles.featureItem}>
          <Feather name="share" size={30} color="#0066cc" />
          <ThemedText style={styles.featureText}>
            Share your recordings with friends and colleagues.
          </ThemedText>
        </View>
      </ThemedView>

      {/* Call to Action Section */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity style={styles.ctaButton}>
          <ThemedText type="defaultSemiBold" style={styles.ctaButtonText}>
            Start Exploring
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heroImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b6b6b',
  },
  featuresContainer: {
    backgroundColor: '#eaf4f8',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 15,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#4a4a4a',
  },
  ctaContainer: {
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
  },
});
