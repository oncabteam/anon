/**
 * VibeMesh SDK React Native Example
 * Demonstrates how to integrate VibeMesh into a React Native app
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';

import VibeMesh, { EVENT_TYPES } from '../../platforms/react-native/VibeMeshReactNative';

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    initializeVibeMesh();
  }, []);

  const initializeVibeMesh = async () => {
    try {
      await VibeMesh.init({
        clientId: 'your-client-id-here',
        endpoint: 'https://api.vibemesh.io/events',
        geo: true, // Enable location tracking
        debugMode: true, // Enable debug logging
      });

      setIsInitialized(true);
      setUserId(VibeMesh.getUserId());
      setSessionId(VibeMesh.getSessionId());
      
      // Update pending count periodically
      const interval = setInterval(() => {
        setPendingCount(VibeMesh.getPendingEventsCount());
      }, 1000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error('Failed to initialize VibeMesh:', error);
      Alert.alert('Error', 'Failed to initialize VibeMesh SDK');
    }
  };

  const trackVenueView = async () => {
    try {
      const venue = {
        id: 'venue_123',
        name: 'The Blue Note',
        category: 'jazz_club',
        tags: ['live_music', 'jazz', 'cocktails'],
        rating: 4.5,
        price_level: 3,
      };

      await VibeMesh.trackVenueView(venue);
      Alert.alert('Success', 'Venue view tracked!');
    } catch (error) {
      console.error('Error tracking venue view:', error);
    }
  };

  const trackEventView = async () => {
    try {
      const event = {
        id: 'event_456',
        name: 'Jazz Night',
        date: '2024-12-01T20:00:00Z',
        venue_id: 'venue_123',
        category: 'music',
        tags: ['jazz', 'live'],
        price: 25,
      };

      await VibeMesh.trackEventView(event);
      Alert.alert('Success', 'Event view tracked!');
    } catch (error) {
      console.error('Error tracking event view:', error);
    }
  };

  const trackSearch = async () => {
    try {
      const results = [
        { id: 'venue_123', name: 'The Blue Note' },
        { id: 'venue_456', name: 'Jazz Cafe' },
      ];

      const filters = {
        category: 'music',
        location: 'New York',
        date: '2024-12-01',
      };

      await VibeMesh.trackSearch('jazz clubs', results, filters);
      Alert.alert('Success', 'Search tracked!');
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  };

  const trackMapInteraction = async () => {
    try {
      const mapState = {
        zoom: 14,
        center: { lat: 40.7128, lng: -74.0060 },
        bounds: {
          north: 40.7200,
          south: 40.7056,
          east: -74.0000,
          west: -74.0120,
        },
        filters: ['music', 'tonight'],
      };

      await VibeMesh.trackMapInteraction('zoom', mapState);
      Alert.alert('Success', 'Map interaction tracked!');
    } catch (error) {
      console.error('Error tracking map interaction:', error);
    }
  };

  const trackTagInteraction = async () => {
    try {
      const tag = {
        id: 'tag_jazz',
        name: 'jazz',
        category: 'music',
      };

      await VibeMesh.trackTagInteraction(tag, 'click');
      Alert.alert('Success', 'Tag interaction tracked!');
    } catch (error) {
      console.error('Error tracking tag interaction:', error);
    }
  };

  const trackFavorite = async () => {
    try {
      const venue = {
        id: 'venue_123',
        name: 'The Blue Note',
        tags: ['jazz', 'live_music'],
      };

      await VibeMesh.trackFavorite(venue, 'venue');
      Alert.alert('Success', 'Favorite tracked!');
    } catch (error) {
      console.error('Error tracking favorite:', error);
    }
  };

  const trackShare = async () => {
    try {
      const event = {
        id: 'event_456',
        name: 'Jazz Night',
        tags: ['jazz', 'live'],
      };

      await VibeMesh.trackShare(event, 'event', 'twitter');
      Alert.alert('Success', 'Share tracked!');
    } catch (error) {
      console.error('Error tracking share:', error);
    }
  };

  const forceFlush = async () => {
    try {
      await VibeMesh.flush();
      Alert.alert('Success', 'Events flushed!');
    } catch (error) {
      console.error('Error flushing events:', error);
    }
  };

  const optOut = async () => {
    try {
      await VibeMesh.optOut();
      Alert.alert('Success', 'Opted out of tracking');
    } catch (error) {
      console.error('Error opting out:', error);
    }
  };

  const optIn = async () => {
    try {
      await VibeMesh.optIn();
      Alert.alert('Success', 'Opted back into tracking');
    } catch (error) {
      console.error('Error opting in:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>VibeMesh SDK Example</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.statusValue, { color: isInitialized ? 'green' : 'red' }]}>
            {isInitialized ? 'Initialized' : 'Not Initialized'}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>User ID:</Text>
          <Text style={styles.statusValue}>{userId || 'Loading...'}</Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Session ID:</Text>
          <Text style={styles.statusValue}>{sessionId || 'Loading...'}</Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Pending Events:</Text>
          <Text style={styles.statusValue}>{pendingCount}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, !isInitialized && styles.buttonDisabled]}
            onPress={trackVenueView}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>Track Venue View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !isInitialized && styles.buttonDisabled]}
            onPress={trackEventView}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>Track Event View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !isInitialized && styles.buttonDisabled]}
            onPress={trackSearch}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>Track Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !isInitialized && styles.buttonDisabled]}
            onPress={trackMapInteraction}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>Track Map Interaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !isInitialized && styles.buttonDisabled]}
            onPress={trackTagInteraction}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>Track Tag Interaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !isInitialized && styles.buttonDisabled]}
            onPress={trackFavorite}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>Track Favorite</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !isInitialized && styles.buttonDisabled]}
            onPress={trackShare}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>Track Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.flushButton, !isInitialized && styles.buttonDisabled]}
            onPress={forceFlush}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>Force Flush</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.optOutButton, !isInitialized && styles.buttonDisabled]}
            onPress={VibeMesh.isOptedOut() ? optIn : optOut}
            disabled={!isInitialized}
          >
            <Text style={styles.buttonText}>
              {VibeMesh.isOptedOut() ? 'Opt In' : 'Opt Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  buttonContainer: {
    marginTop: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  flushButton: {
    backgroundColor: '#34C759',
  },
  optOutButton: {
    backgroundColor: '#FF3B30',
  },
});

export default App;