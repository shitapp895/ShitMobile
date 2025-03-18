import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot, collection, query, where, writeBatch, arrayRemove } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { firestore, database } from '../firebase/config';
import { getFriends } from '../services/database/friendService';
import { FriendData } from '../types/friend';

// Cache duration in milliseconds: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const MIN_LOADING_DURATION = 500;

export const useFriends = (userId: string) => {
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);
  const statusListeners = useRef<{ [key: string]: () => void }>({});
  const cache = useRef<{ friends: FriendData[], timestamp: number } | null>(null);

  // Helper function to ensure minimum loading time
  const ensureMinLoadingTime = (startTime: number, callback: () => void) => {
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOADING_DURATION - elapsed);
    setTimeout(callback, remainingTime);
  };

  // Cache operations
  const saveToCache = async (friendsData: FriendData[]) => {
    try {
      const cacheData = {
        friends: friendsData,
        timestamp: Date.now()
      };
      
      // Update memory cache
      cache.current = cacheData;
      
      // Update persistent cache
      await AsyncStorage.setItem(
        `friends_${userId}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error('Error saving friends to cache:', error);
    }
  };

  const loadFromCache = async (): Promise<FriendData[] | null> => {
    // Try memory cache first
    if (cache.current && Date.now() - cache.current.timestamp < CACHE_DURATION) {
      return cache.current.friends;
    }
    
    // Try persistent cache
    try {
      const cachedData = await AsyncStorage.getItem(`friends_${userId}`);
      if (!cachedData) return null;
      
      const { friends, timestamp } = JSON.parse(cachedData);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > CACHE_DURATION) {
        await AsyncStorage.removeItem(`friends_${userId}`);
        return null;
      }
      
      // Update memory cache
      cache.current = { friends, timestamp };
      return friends;
    } catch (error) {
      console.error('Error loading friends from cache:', error);
      return null;
    }
  };

  // Setup a consolidated listener for real-time status updates
  const setupConsolidatedStatusListener = () => {
    if (!userId || friends.length === 0) return;
    
    // Clear any existing listeners
    cleanupStatusListeners();
    
    // Create a new consolidated listener for all friends
    const friendIds = friends.map(friend => friend.id);
    const statusRef = ref(database, 'status');
    
    const newListener = onValue(statusRef, (snapshot) => {
      const statuses = snapshot.val();
      if (!statuses) return;
      
      let updated = false;
      const updatedFriends = friends.map(friend => {
        if (statuses[friend.id]) {
          const isShitting = statuses[friend.id].isShitting || false;
          if (friend.isShitting !== isShitting) {
            updated = true;
            return { ...friend, isShitting };
          }
        }
        return friend;
      });
      
      if (updated) {
        setFriends(updatedFriends);
        saveToCache(updatedFriends);
      }
    });
    
    // Store cleanup function
    statusListeners.current.consolidated = () => newListener();
  };

  // Clean up all status listeners
  const cleanupStatusListeners = () => {
    Object.values(statusListeners.current).forEach(cleanup => cleanup());
    statusListeners.current = {};
  };

  // Main function to get friends
  const getFriendsData = async (forceRefresh = false): Promise<void> => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    if (!forceRefresh) {
      setLoading(true);
    }
    
    const startTime = Date.now();
    
    try {
      // Try loading from cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedFriends = await loadFromCache();
        if (cachedFriends) {
          setFriends(cachedFriends);
          setupConsolidatedStatusListener();
          ensureMinLoadingTime(startTime, () => setLoading(false));
          return;
        }
      }
      
      // If cache is invalid or forcing refresh, fetch from server
      const fetchedFriends = await getFriends(userId);
      
      if (fetchedFriends) {
        setFriends(fetchedFriends);
        saveToCache(fetchedFriends);
        setupConsolidatedStatusListener();
      }
      
      ensureMinLoadingTime(startTime, () => setLoading(false));
    } catch (error) {
      console.error('Error fetching friends:', error);
      Alert.alert('Error', 'Failed to load friends. Please try again.');
      ensureMinLoadingTime(startTime, () => setLoading(false));
    }
  };

  // Function to update friend statuses without refreshing the entire list
  const updateFriendStatuses = async (): Promise<void> => {
    if (!userId || friends.length === 0) return;
    
    try {
      const statusUpdates = await Promise.all(
        friends.map(async (friend) => {
          const statusRef = ref(database, `status/${friend.id}`);
          return new Promise<{ id: string, isShitting: boolean }>((resolve) => {
            onValue(statusRef, (snapshot) => {
              const statusData = snapshot.val();
              resolve({
                id: friend.id,
                isShitting: statusData?.isShitting || false
              });
            }, { onlyOnce: true });
          });
        })
      );
      
      // Update friend statuses
      const updatedFriends = friends.map(friend => {
        const statusUpdate = statusUpdates.find(update => update.id === friend.id);
        if (statusUpdate && statusUpdate.isShitting !== friend.isShitting) {
          return { ...friend, isShitting: statusUpdate.isShitting };
        }
        return friend;
      });
      
      setFriends(updatedFriends);
      saveToCache(updatedFriends);
    } catch (error) {
      console.error('Error updating friend statuses:', error);
    }
  };

  // Function to remove a friend
  const removeFriend = async (friendId: string): Promise<boolean | undefined> => {
    if (!userId || !friendId) {
      Alert.alert('Error', 'Unable to remove friend at this time.');
      return;
    }
    
    try {
      // First prompt the user to confirm
      return new Promise((resolve) => {
        Alert.alert(
          'Remove Friend',
          'Are you sure you want to remove this friend?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false)
            },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                // Update local Firestore
                const batch = writeBatch(firestore);
                
                // Remove friend from user's friends list
                const userRef = doc(firestore, 'users', userId);
                batch.update(userRef, {
                  friends: arrayRemove(friendId)
                });
                
                // Remove user from friend's friends list
                const friendRef = doc(firestore, 'users', friendId);
                batch.update(friendRef, {
                  friends: arrayRemove(userId)
                });
                
                await batch.commit();
                
                // Update local state
                setFriends(prev => prev.filter(f => f.id !== friendId));
                
                // Update cache
                const updatedFriends = friends.filter(f => f.id !== friendId);
                saveToCache(updatedFriends);
                
                Alert.alert('Success', 'Friend removed successfully.');
                resolve(true);
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('Error removing friend:', error);
      Alert.alert('Error', 'Failed to remove friend. Please try again.');
      return false;
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (userId) {
      getFriendsData();
    }
    
    return () => {
      cleanupStatusListeners();
    };
  }, [userId]);

  return {
    friends,
    loading,
    getFriends: getFriendsData,
    removeFriend,
    updateFriendStatuses,
    cleanupStatusListeners,
    setupConsolidatedStatusListener
  };
}; 