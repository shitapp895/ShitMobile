import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl, 
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { RootStackParamList } from '../navigation/types';
import { Button } from '../components/common';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { userData, updateUserStatus, currentUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  
  // Stats are only used for the timer on the home screen now
  // Full stats are available on the profile screen
  const [stats, setStats] = useState({
    isShitting: userData?.isShitting || false,
    shitStartTime: userData?.lastShitStartTime || 0,
  });
  
  const [currentDuration, setCurrentDuration] = useState(0);
  
  // Update stats when userData changes
  useEffect(() => {
    if (userData) {
      setStats({
        isShitting: userData.isShitting || false,
        shitStartTime: userData.lastShitStartTime || 0,
      });
    }
  }, [userData]);
  
  // Set up real-time listener for user data
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const userDoc = doc(firestore, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDoc, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setStats({
          isShitting: data.isShitting || false,
          shitStartTime: data.lastShitStartTime || 0,
        });
      }
    }, (error) => {
      console.error("Error listening to user document:", error);
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  // Update timer for current shit duration
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (stats.isShitting && stats.shitStartTime) {
      interval = setInterval(() => {
        setCurrentDuration(Date.now() - stats.shitStartTime);
      }, 1000);
    } else {
      setCurrentDuration(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stats.isShitting, stats.shitStartTime]);
  
  // Format duration in minutes and seconds
  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };
  
  // Calculate current shit duration if user is shitting
  const getCurrentShitDuration = () => {
    if (stats.isShitting && stats.shitStartTime) {
      return currentDuration;
    }
    return 0;
  };
  
  // Toggle shit status
  const toggleShitStatus = useCallback(async () => {
    try {
      console.log("Toggling shit status to:", !stats.isShitting);
      await updateUserStatus(!stats.isShitting);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }, [stats.isShitting, updateUserStatus]);
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // In a real app, you might fetch updated data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };
  
  // Dismiss keyboard when tapping outside input
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  // Navigate to error handling demo screen
  const navigateToErrorHandling = () => {
    navigation.navigate('ErrorHandling');
  };
  
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hello, {userData?.displayName || 'Friend'}!
          </Text>
          <Text style={styles.statusText}>
            {stats.isShitting ? 'Currently Shitting' : 'Not Shitting'}
          </Text>
        </View>
        
        <View style={styles.statusCard}>
          <TouchableOpacity 
            style={[
              styles.statusButton, 
              stats.isShitting ? styles.activeButton : styles.inactiveButton
            ]}
            onPress={toggleShitStatus}
          >
            <Ionicons 
              name={stats.isShitting ? 'water' : 'water-outline'} 
              size={32} 
              color="#fff" 
            />
            <Text style={styles.statusButtonText}>
              {stats.isShitting ? 'End Shit' : 'Start Shit'}
            </Text>
          </TouchableOpacity>
          
          {stats.isShitting && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Current Duration:</Text>
              <Text style={styles.timerValue}>
                {formatDuration(getCurrentShitDuration())}
              </Text>
            </View>
          )}
        </View>
        
        {/* Stats section removed - now only shown on Profile screen to reduce redundancy */}
        
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>Shit Tips</Text>
          
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={24} color="#6366f1" style={styles.tipIcon} />
            <Text style={styles.tipText}>
              Stay hydrated! Drinking water helps prevent constipation.
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="time-outline" size={24} color="#6366f1" style={styles.tipIcon} />
            <Text style={styles.tipText}>
              Try to maintain a regular schedule for bowel movements.
            </Text>
          </View>
          
          <View style={styles.tipCard}>
            <Ionicons name="nutrition-outline" size={24} color="#6366f1" style={styles.tipIcon} />
            <Text style={styles.tipText}>
              Eat fiber-rich foods like fruits, vegetables, and whole grains.
            </Text>
          </View>
        </View>
        
        <View style={styles.devSection}>
          <Text style={styles.sectionTitle}>Developer Tools</Text>
          <Button
            title="Error Handling Demo"
            onPress={navigateToErrorHandling}
            variant="outline"
            leftIcon={<Ionicons name="warning-outline" size={18} color="#6366f1" />}
            style={styles.demoButton}
          />
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  statusCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  activeButton: {
    backgroundColor: '#ef4444',
  },
  inactiveButton: {
    backgroundColor: '#6366f1',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timerContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  tipsContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tipIcon: {
    marginRight: 15,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  devSection: {
    margin: 15,
    marginTop: 0,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  demoButton: {
    marginTop: 10,
  },
}); 