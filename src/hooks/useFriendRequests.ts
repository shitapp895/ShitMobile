import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FriendRequest, 
  checkPendingRequest, 
  sendFriendRequest as sendRequest, 
  acceptFriendRequest as acceptRequest, 
  declineFriendRequest as declineRequest, 
  cancelFriendRequest as cancelRequest, 
  getReceivedFriendRequests,
  getSentFriendRequests
} from '../services/database/friendRequestService';
import { Timestamp } from 'firebase/firestore';

// Updated interface for cache
interface RequestsCache {
  received: FriendRequest[];
  sent: FriendRequest[];
  timestamp: number;
}

// Cache duration in milliseconds: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const MIN_LOADING_DURATION = 500;

export const useFriendRequests = (userId: string) => {
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper functions
  const ensureMinLoadingTime = (startTime: number, callback: () => void) => {
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOADING_DURATION - elapsed);
    setTimeout(callback, remainingTime);
  };

  const saveToCache = async (requests: { received: FriendRequest[], sent: FriendRequest[] }) => {
    try {
      await AsyncStorage.setItem(
        `friend_requests_${userId}`,
        JSON.stringify({
          timestamp: Date.now(),
          received: requests.received,
          sent: requests.sent
        })
      );
    } catch (error) {
      console.error('Error saving friend requests to cache:', error);
    }
  };

  const loadFromCache = async (): Promise<RequestsCache | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(`friend_requests_${userId}`);
      if (!cachedData) return null;

      const data = JSON.parse(cachedData) as RequestsCache;
      const isExpired = Date.now() - data.timestamp > CACHE_DURATION;
      
      if (isExpired) {
        await AsyncStorage.removeItem(`friend_requests_${userId}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error loading friend requests from cache:', error);
      return null;
    }
  };

  // Main function to fetch friend requests with caching
  const fetchFriendRequests = async (forceRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    if (!forceRefresh) {
      setLoading(true);
    }
    
    const startTime = Date.now();
    
    try {
      let receivedReqs: FriendRequest[] = [];
      let sentReqs: FriendRequest[] = [];
      
      // Try to load from cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await loadFromCache();
        if (cachedData) {
          setReceivedRequests(cachedData.received);
          setSentRequests(cachedData.sent);
          ensureMinLoadingTime(startTime, () => setLoading(false));
          return;
        }
      }
      
      // If cache is invalid or forcing refresh, fetch from server
      const [received, sent] = await Promise.all([
        getReceivedFriendRequests(userId),
        getSentFriendRequests(userId)
      ]);
      
      // Update state
      setReceivedRequests(received);
      setSentRequests(sent);
      
      // Save to cache
      saveToCache({
        received,
        sent
      });
      
      ensureMinLoadingTime(startTime, () => setLoading(false));
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      ensureMinLoadingTime(startTime, () => setLoading(false));
    }
  };

  // Send a friend request
  const sendFriendRequest = async (receiverId: string): Promise<void> => {
    if (!userId || !receiverId) {
      Alert.alert('Error', 'Unable to send friend request at this time.');
      return;
    }
    
    try {
      // Check if there's already a pending request
      const pendingRequest = await checkPendingRequest(userId, receiverId);
      if (pendingRequest) {
        Alert.alert('Friend Request Exists', 'A friend request already exists between you and this user.');
        return;
      }
      
      const requestId = await sendRequest(userId, receiverId);
      if (requestId) {
        // Add to sent requests
        const newRequest: FriendRequest = {
          id: requestId,
          senderId: userId,
          receiverId: receiverId,
          status: 'pending',
          timestamp: Timestamp.now()
        };
        
        setSentRequests(prev => [...prev, newRequest]);
        
        // Update cache
        const cachedData = await loadFromCache();
        if (cachedData) {
          saveToCache({
            received: cachedData.received,
            sent: [...cachedData.sent, newRequest]
          });
        }
        
        Alert.alert('Success', 'Friend request sent!');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  // Accept a friend request
  const acceptFriendRequest = async (requestId: string): Promise<void> => {
    if (!userId || !requestId) {
      Alert.alert('Error', 'Unable to accept friend request at this time.');
      return;
    }
    
    try {
      await acceptRequest(requestId);
      
      // Remove from received requests
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Update cache
      const cachedData = await loadFromCache();
      if (cachedData) {
        saveToCache({
          received: cachedData.received.filter(req => req.id !== requestId),
          sent: cachedData.sent
        });
      }
      
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  // Decline a friend request
  const declineFriendRequest = async (requestId: string): Promise<void> => {
    if (!userId || !requestId) {
      Alert.alert('Error', 'Unable to decline friend request at this time.');
      return;
    }
    
    try {
      await declineRequest(requestId);
      
      // Remove from received requests
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Update cache
      const cachedData = await loadFromCache();
      if (cachedData) {
        saveToCache({
          received: cachedData.received.filter(req => req.id !== requestId),
          sent: cachedData.sent
        });
      }
      
      Alert.alert('Success', 'Friend request declined.');
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    }
  };

  // Cancel a sent friend request
  const cancelFriendRequest = async (requestId: string): Promise<void> => {
    if (!userId || !requestId) {
      Alert.alert('Error', 'Unable to cancel friend request at this time.');
      return;
    }
    
    try {
      await cancelRequest(requestId, userId);
      
      // Remove from sent requests
      setSentRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Update cache
      const cachedData = await loadFromCache();
      if (cachedData) {
        saveToCache({
          received: cachedData.received,
          sent: cachedData.sent.filter(req => req.id !== requestId)
        });
      }
      
      Alert.alert('Success', 'Friend request cancelled.');
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    }
  };

  // Initial fetch of friend requests
  useEffect(() => {
    if (userId) {
      fetchFriendRequests();
    }
  }, [userId]);

  return {
    receivedRequests,
    sentRequests,
    loading,
    fetchFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest
  };
}; 