import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, getFirestore, getDoc as getDocument, writeBatch, enableIndexedDbPersistence, DocumentSnapshot } from 'firebase/firestore';
import { ref, onValue, get } from 'firebase/database';
import { firestore, database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { searchUsers, addFriend } from '../services/database/userService';
import { 
  FriendRequest, 
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest, 
  cancelFriendRequest,
  getReceivedFriendRequests,
  getSentFriendRequests,
  checkPendingRequest
} from '../services/database/friendRequestService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FriendData {
  id: string;
  displayName: string;
  photoURL: string | null;
  isOnline: boolean;
  isShitting: boolean;
}

interface UserSearchResult {
  uid: string;
  displayName: string;
  photoURL: string | null;
  requestStatus?: 'none' | 'sent' | 'received';
  requestId?: string;
  isFriend: boolean;
}

interface RequestSection {
  title: string;
  data: FriendRequest[];
  icon: 'arrow-down-circle-outline' | 'arrow-up-circle-outline';
  emptyText: string;
}

// Define cache interface
interface FriendsCache {
  friends: { [key: string]: FriendData };
  lastUpdated: number;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export default function FriendsScreen() {
  const { userData } = useAuth();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'online', 'shitting', 'requests'
  
  // Friend request states
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  
  // Add friends modal states
  const [addFriendsModalVisible, setAddFriendsModalVisible] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);

  // Add this state for caching user data
  const [requestUserData, setRequestUserData] = useState<{[key: string]: { displayName: string, photoURL: string | null }}>({});

  // Add ref to store cleanup functions and cache
  const statusListeners = useRef<(() => void)[]>([]);
  const friendsCache = useRef<FriendsCache>({ friends: {}, lastUpdated: 0 });
  
  // Add friend request cache
  const requestsCache = useRef<{
    received: FriendRequest[];
    sent: FriendRequest[];
    lastUpdated: number;
  }>({
    received: [],
    sent: [],
    lastUpdated: 0
  });

  // Add preloading flag to avoid repeated loads
  const hasPreloaded = useRef(false);

  // Add state to track loading start times
  const loadingStartTime = useRef<number>(0);
  const requestsLoadingStartTime = useRef<number>(0);

  // Cleanup function for status listeners
  const cleanupStatusListeners = () => {
    statusListeners.current.forEach(cleanup => cleanup());
    statusListeners.current = [];
  };

  // Cache operations
  const saveFriendsToCache = async (friendsData: { [key: string]: FriendData }) => {
    try {
      friendsCache.current = {
        friends: friendsData,
        lastUpdated: Date.now()
      };
      
      // Also save to AsyncStorage for persistence between app sessions
      await AsyncStorage.setItem(
        `friends_${userData?.uid}`, 
        JSON.stringify(friendsCache.current)
      );
    } catch (error) {
      console.error('Error saving friends to cache:', error);
    }
  };

  const loadFriendsFromCache = async (): Promise<boolean> => {
    try {
      // First check in-memory cache
      if (
        friendsCache.current.lastUpdated > 0 && 
        Date.now() - friendsCache.current.lastUpdated < CACHE_DURATION
      ) {
        setFriends(Object.values(friendsCache.current.friends));
        return true;
      }
      
      // If in-memory cache is expired, try AsyncStorage
      const cachedData = await AsyncStorage.getItem(`friends_${userData?.uid}`);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData) as FriendsCache;
        
        if (Date.now() - parsedCache.lastUpdated < CACHE_DURATION) {
          friendsCache.current = parsedCache;
          setFriends(Object.values(parsedCache.friends));
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error loading friends from cache:', error);
      return false;
    }
  };

  // Helper function to ensure minimum loading duration
  const ensureMinLoadingDuration = (
    startTimeRef: React.MutableRefObject<number>,
    setLoadingState: (isLoading: boolean) => void,
    minDuration: number = 1000
  ) => {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTimeRef.current;
    
    if (elapsedTime < minDuration) {
      // If not enough time has passed, wait until minimum duration is reached
      setTimeout(() => {
        setLoadingState(false);
      }, minDuration - elapsedTime);
    } else {
      // If minimum duration has passed, update immediately
      setLoadingState(false);
    }
  };

  // Fetch friend requests with caching
  const fetchFriendRequests = async (forceRefresh = false) => {
    if (!userData?.uid) return;
    
    // Try to use cache first without setting loading state
    if (!forceRefresh && Date.now() - requestsCache.current.lastUpdated < CACHE_DURATION) {
      setReceivedRequests(requestsCache.current.received);
      setSentRequests(requestsCache.current.sent);
      return;
    }
    
    // Only set loading if we need to fetch from network
    setRequestsLoading(true);
    requestsLoadingStartTime.current = Date.now();
    
    try {
      const [received, sent] = await Promise.all([
        getReceivedFriendRequests(userData.uid),
        getSentFriendRequests(userData.uid)
      ]);
      
      // Update state
      setReceivedRequests(received);
      setSentRequests(sent);
      
      // Update cache
      requestsCache.current = {
        received,
        sent,
        lastUpdated: Date.now()
      };
      
      // Also save to AsyncStorage
      await AsyncStorage.setItem(
        `friend_requests_${userData?.uid}`,
        JSON.stringify(requestsCache.current)
      );
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      Alert.alert('Error', 'Failed to load friend requests');
    } finally {
      // Ensure loading indicator shows for at least 1 second
      ensureMinLoadingDuration(requestsLoadingStartTime, setRequestsLoading);
    }
  };

  // Load cached requests on mount
  useEffect(() => {
    const loadCachedRequests = async () => {
      if (!userData?.uid) return;
      
      try {
        const cachedData = await AsyncStorage.getItem(`friend_requests_${userData?.uid}`);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (Date.now() - parsed.lastUpdated < CACHE_DURATION) {
            requestsCache.current = parsed;
            if (activeTab === 'requests') {
              setReceivedRequests(parsed.received);
              setSentRequests(parsed.sent);
            }
          }
        }
      } catch (error) {
        console.error('Error loading cached requests:', error);
      }
    };
    
    loadCachedRequests();
  }, [userData?.uid]);

  // Extract fetchFriends function to reuse it
  const fetchFriends = async (forceRefresh = false) => {
    if (!userData?.uid) return;
    
    // Try to load from cache first without setting loading state
    const cacheHit = !forceRefresh && await loadFriendsFromCache();
    if (cacheHit) {
      console.log('Using cached friends data');
      // Still set up status listeners for real-time updates
      setupConsolidatedStatusListener();
      return;
    }
    
    // Only set loading if we need to fetch from network and we haven't shown anything yet
    if (friends.length === 0) {
      setLoading(true);
      loadingStartTime.current = Date.now();
    }
    
    try {
      // Clean up existing listeners before setting up new ones (but don't clean up during a refresh)
      if (!forceRefresh) {
        cleanupStatusListeners();
      }
      
      // Get current user's friends list
      const userDocRef = doc(firestore, 'users', userData.uid);
      const userDoc = await getDoc(userDocRef);
      const friendIds = userDoc.data()?.friends || [];
      
      if (friendIds.length === 0) {
        setFriends([]);
        // Still ensure minimum loading time
        if (loading) {
          ensureMinLoadingDuration(loadingStartTime, setLoading);
        }
        return;
      }
      
      // Create an object to store friend data, preserving existing statuses
      const friendsData: { [key: string]: FriendData } = {};
      
      // Create a map of existing friends to preserve their status
      const existingFriendsMap: { [key: string]: FriendData } = {};
      if (forceRefresh) {
        // When refreshing, preserve the existing status information
        friends.forEach(friend => {
          existingFriendsMap[friend.id] = {
            ...friend
          };
        });
      }
      
      // Batch get friend documents instead of individual queries
      const friendDocs: DocumentSnapshot[] = await Promise.all(
        friendIds.map(id => getDoc(doc(firestore, 'users', id)))
      );
      
      // Process the batch results
      friendDocs.forEach((friendDoc, index) => {
        if (friendDoc.exists()) {
          const friendId = friendIds[index];
          const data = friendDoc.data();
          
          // If we're refreshing and have existing status, preserve it
          const existingFriend = existingFriendsMap[friendId];
          
          friendsData[friendId] = {
            id: friendId,
            displayName: data.displayName || 'Unknown',
            photoURL: data.photoURL,
            // Preserve current status if refreshing, otherwise default to offline
            isOnline: existingFriend ? existingFriend.isOnline : false,
            isShitting: existingFriend ? existingFriend.isShitting : false
          };
        }
      });
      
      // Set initial friends state
      const friendsList = Object.values(friendsData);
      setFriends(friendsList);
      
      // Save to cache
      await saveFriendsToCache(friendsData);
      
      // If we're refreshing, we don't want to reset the listeners because that would
      // temporarily show everyone as offline. Instead, just ensure we have a listener.
      if (!statusListeners.current.length) {
        setupConsolidatedStatusListener();
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      // Ensure loading indicator shows for at least 1 second
      if (loading) {
        ensureMinLoadingDuration(loadingStartTime, setLoading);
      }
    }
  };
  
  // Set up a single consolidated listener for all friends' statuses
  const setupConsolidatedStatusListener = () => {
    if (!userData?.uid || !friendsCache.current.friends) return;
    
    const friendIds = Object.keys(friendsCache.current.friends);
    if (friendIds.length === 0) return;
    
    // Only clean up if we actually have listeners, otherwise we're just adding a fresh one
    if (statusListeners.current.length > 0) {
      cleanupStatusListeners();
    }
    
    // Create one listener for status changes instead of one per friend
    const statusRef = ref(database, 'status');
    const statusListener = onValue(statusRef, (snapshot) => {
      const statusData = snapshot.val() || {};
      let hasUpdates = false;
      
      // Update friend status in cache
      const updatedFriendsData = { ...friendsCache.current.friends };
      
      // Only process status updates for friends that exist in our friend list
      friendIds.forEach(friendId => {
        // Skip if this friendId doesn't exist in our data (might have been removed)
        if (!updatedFriendsData[friendId]) return;
        
        const friendStatus = statusData[friendId];
        if (friendStatus) {
          // Extract online status correctly - check both formats that might be used
          const isOnline = Boolean(friendStatus.online || friendStatus.isOnline);
          const isShitting = Boolean(friendStatus.isShitting);
          
          // Only update if status has actually changed
          if (
            updatedFriendsData[friendId].isOnline !== isOnline ||
            updatedFriendsData[friendId].isShitting !== isShitting
          ) {
            updatedFriendsData[friendId] = {
              ...updatedFriendsData[friendId],
              isOnline,
              isShitting
            };
            
            // Log status changes for debugging
            console.log(`Status update for ${updatedFriendsData[friendId].displayName}: `, {
              isOnline, 
              isShitting,
              rawStatus: friendStatus
            });
            
            hasUpdates = true;
          }
        }
      });
      
      // Only update state if there were actual changes
      if (hasUpdates) {
        console.log('Friend status updates detected - updating UI');
        // Update cache
        friendsCache.current.friends = updatedFriendsData;
        // Update UI
        setFriends(Object.values(updatedFriendsData));
      }
    });
    
    // Store cleanup function
    statusListeners.current.push(() => statusListener());
  };

  // Preload friends data when component mounts
  useEffect(() => {
    const preloadData = async () => {
      if (hasPreloaded.current || !userData?.uid) return;
      
      console.log('Preloading friends data...');
      try {
        // Try to load from cache first
        const cachedFriends = await AsyncStorage.getItem(`friends_${userData?.uid}`);
        if (cachedFriends) {
          const parsedCache = JSON.parse(cachedFriends) as FriendsCache;
          friendsCache.current = parsedCache;
          
          // Immediately set friends from cache to show something right away
          if (Object.keys(parsedCache.friends).length > 0) {
            console.log('Using cached friends data for immediate display');
            setFriends(Object.values(parsedCache.friends));
            setLoading(false);
          }
        }
        
        // Also preload friend requests
        const cachedRequests = await AsyncStorage.getItem(`friend_requests_${userData?.uid}`);
        if (cachedRequests) {
          const parsed = JSON.parse(cachedRequests);
          requestsCache.current = parsed;
        }
        
        hasPreloaded.current = true;
      } catch (error) {
        console.error('Error preloading data:', error);
      }
    };
    
    preloadData();
  }, [userData?.uid]);

  // Use fetchFriends in the useEffect with a slight delay to allow UI to render first
  useEffect(() => {
    if (userData?.uid) {
      // If we already have loaded from cache in preload, give a small delay before fetching again
      const delay = hasPreloaded.current ? 500 : 0;
      
      const timer = setTimeout(() => {
        if (activeTab !== 'requests') {
          fetchFriends();
        } else {
          fetchFriendRequests();
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [userData?.uid, activeTab]);

  // Clean up listeners when component unmounts
  useEffect(() => {
    return () => {
      cleanupStatusListeners();
    };
  }, []);

  // Filter friends based on search query and active tab
  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Log debug info for online tab
    if (activeTab === 'online') {
      console.log(`ONLINE TAB CHECK - Friend ${friend.displayName}: isOnline=${friend.isOnline}, will show=${friend.isOnline && matchesSearch}`);
    }
    
    // CRITICAL DEBUGGING: Always log when in shitting tab
    if (activeTab === 'shitting') {
      console.log(`SHITTING TAB CHECK - Friend ${friend.displayName}: isShitting=${friend.isShitting}, will show=${friend.isShitting && matchesSearch}`);
    }
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'online') {
      // For online tab, explicitly check if isOnline is true
      return matchesSearch && (friend.isOnline === true);
    }
    if (activeTab === 'shitting') {
      // For shitting tab, ONLY check if they're shitting (regardless of online status)
      return matchesSearch && (friend.isShitting === true);
    }
    
    return matchesSearch;
  });
  
  // Render friend item
  const renderFriendItem = ({ item }: { item: FriendData }) => (
    <TouchableOpacity style={styles.friendItem}>
      <View style={styles.friendAvatar}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
          </View>
        )}
        <View 
          style={[
            styles.statusIndicator, 
            item.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
            item.isShitting && styles.shittingIndicator
          ]} 
        />
      </View>
      
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.displayName}</Text>
        <Text style={styles.friendStatus}>
          {item.isShitting ? 'Currently Shitting' : (item.isOnline ? 'Online' : 'Offline')}
        </Text>
      </View>
      
      <TouchableOpacity 
        onPress={() => {
          Alert.alert(
            'Remove Friend',
            `Are you sure you want to remove ${item.displayName} from your friends?`,
            [
              {
                text: 'Cancel',
                style: 'cancel'
              },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => handleRemoveFriend(item.id)
              }
            ]
          );
        }}
      >
        <Ionicons name="person-remove" size={24} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  // Function to handle searching for users
  const handleSearchUsers = async () => {
    if (!userSearchQuery.trim() || !userData?.uid) return;
    
    setSearching(true);
    try {
      const users = await searchUsers(userSearchQuery);
      
      // Filter out current user only
      const filteredUsers = users.filter(user => user.uid !== userData.uid);
      
      // Check for pending requests and friend status
      const usersWithStatus = await Promise.all(
        filteredUsers.map(async (user) => {
          const isFriend = Boolean(userData.friends?.includes(user.uid));
          const pendingRequest = await checkPendingRequest(userData.uid, user.uid);
          
          console.log('Pending request for user:', user.displayName, pendingRequest);
          
          const requestStatus: 'none' | 'sent' | 'received' = pendingRequest ? 
            (pendingRequest.senderId === userData.uid ? 'sent' : 'received') : 
            'none';
          
          const result = {
            uid: user.uid,
            displayName: user.displayName || 'Unknown',
            photoURL: user.photoURL,
            isFriend,
            requestStatus,
            requestId: pendingRequest?.id
          };
          
          console.log('User search result:', result);
          return result;
        })
      );
      
      console.log('Setting search results:', usersWithStatus);
      setSearchResults(usersWithStatus);
      
      if (usersWithStatus.length === 0) {
        Alert.alert('No Users Found', 'No users match your search.');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search for users. Please try again.');
    } finally {
      setSearching(false);
    }
  };
  
  // Function to handle sending a friend request
  const handleSendFriendRequest = async (receiverId: string) => {
    if (!userData?.uid) return;
    
    try {
      console.log('Sending friend request to:', receiverId);
      const requestId = await sendFriendRequest(userData.uid, receiverId);
      console.log('Friend request sent with ID:', requestId);
      
      // Update UI with the new request ID
      setSearchResults(prevResults => {
        console.log('Current search results:', prevResults);
        const updatedResults = prevResults.map(user => {
          if (user.uid === receiverId) {
            const updatedUser = {
              ...user,
              requestStatus: 'sent' as const,
              requestId // Make sure we're using the requestId from sendFriendRequest
            };
            console.log('Updating user with request ID:', updatedUser);
            return updatedUser;
          }
          return user;
        });
        console.log('Updated search results:', updatedResults);
        return updatedResults;
      });

      // Create a new request object and add it to sent requests immediately
      const receiverRef = doc(firestore, 'users', receiverId);
      const receiverDoc = await getDoc(receiverRef);
      const receiverData = receiverDoc.data() || {};
      
      const newRequest: FriendRequest = {
        id: requestId,
        senderId: userData.uid,
        receiverId: receiverId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        receiverName: receiverData.displayName || 'Unknown',
        receiverPhotoURL: receiverData.photoURL || null
      };
      
      // Update local state to show the sent request immediately
      setSentRequests(prev => [...prev, newRequest]);
      
      // Also update the cache
      requestsCache.current = {
        ...requestsCache.current,
        sent: [...requestsCache.current.sent, newRequest]
      };
      await AsyncStorage.setItem(
        `friend_requests_${userData?.uid}`,
        JSON.stringify(requestsCache.current)
      );
      
      Alert.alert('Success', 'Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  // Function to handle accepting a friend request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      // Find the request in our current state
      const request = receivedRequests.find(req => req.id === requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      // Accept the request on the server
      await acceptFriendRequest(requestId);
      
      // Update local state immediately
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Update the cache
      requestsCache.current = {
        ...requestsCache.current,
        received: requestsCache.current.received.filter(req => req.id !== requestId)
      };
      await AsyncStorage.setItem(
        `friend_requests_${userData?.uid}`,
        JSON.stringify(requestsCache.current)
      );
      
      // Add the new friend to the friends list immediately
      if (request.senderId) {
        const senderRef = doc(firestore, 'users', request.senderId);
        const senderDoc = await getDoc(senderRef);
        const senderData = senderDoc.data() || {};
        
        const newFriend: FriendData = {
          id: request.senderId,
          displayName: senderData.displayName || 'Unknown',
          photoURL: senderData.photoURL,
          isOnline: false,
          isShitting: false
        };
        
        // Check if friend already exists in the list
        const friendExists = friends.some(f => f.id === request.senderId);
        if (!friendExists) {
          // Add to friends list
          setFriends(prev => [...prev, newFriend]);
          
          // Update friends cache
          const updatedFriendsData = { ...friendsCache.current.friends };
          updatedFriendsData[request.senderId] = newFriend;
          await saveFriendsToCache(updatedFriendsData);
          
          // Set up status listener if needed
          setupConsolidatedStatusListener();
        }
      }
      
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error: any) {
      // Check if the error is because the request was cancelled
      if (error.status === 'cancelled') {
        Alert.alert(
          'Request Cancelled',
          'This friend request has been cancelled by the sender.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh the requests to remove the cancelled request from the UI
                setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
                requestsCache.current = {
                  ...requestsCache.current,
                  received: requestsCache.current.received.filter(req => req.id !== requestId)
                };
                AsyncStorage.setItem(
                  `friend_requests_${userData?.uid}`,
                  JSON.stringify(requestsCache.current)
                );
              }
            }
          ]
        );
      } else {
        console.error('Error accepting friend request:', error);
        Alert.alert('Error', 'Failed to accept friend request. Please try again.');
      }
    }
  };

  // Function to handle declining a friend request
  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
      
      // Update local state immediately
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Update the cache
      requestsCache.current = {
        ...requestsCache.current,
        received: requestsCache.current.received.filter(req => req.id !== requestId)
      };
      await AsyncStorage.setItem(
        `friend_requests_${userData?.uid}`,
        JSON.stringify(requestsCache.current)
      );
      
      Alert.alert('Success', 'Friend request declined');
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    }
  };

  // Function to handle canceling a sent friend request
  const handleCancelRequest = async (requestId: string) => {
    if (!userData?.uid) return;
    
    console.log('Attempting to cancel request:', requestId);
    console.log('Current user:', userData.uid);
    
    try {
      await cancelFriendRequest(requestId, userData.uid);
      
      // Update sent requests state immediately
      setSentRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Update the cache
      requestsCache.current = {
        ...requestsCache.current,
        sent: requestsCache.current.sent.filter(req => req.id !== requestId)
      };
      await AsyncStorage.setItem(
        `friend_requests_${userData?.uid}`,
        JSON.stringify(requestsCache.current)
      );
      
      // Update search results
      setSearchResults(prevResults => {
        console.log('Updating search results after cancel. Current results:', prevResults);
        return prevResults.map(user => {
          if (user.requestId === requestId) {
            console.log('Found matching user to update:', user);
            return { ...user, requestStatus: 'none', requestId: undefined };
          }
          return user;
        });
      });
      
      Alert.alert('Success', 'Friend request canceled');
    } catch (error) {
      console.error('Error canceling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    }
  };

  // Handle remove friend - optimize with batch operations
  const handleRemoveFriend = async (friendId: string) => {
    if (!userData?.uid) return;
    
    try {
      const batch = writeBatch(firestore);
      
      // Update current user's friends list
      const userRef = doc(firestore, 'users', userData.uid);
      batch.update(userRef, {
        friends: arrayRemove(friendId)
      });
      
      // Update removed friend's friends list
      const friendRef = doc(firestore, 'users', friendId);
      batch.update(friendRef, {
        friends: arrayRemove(userData.uid)
      });
      
      // Commit the batch
      await batch.commit();
      
      // Update local state and cache
      const updatedFriends = friends.filter(friend => friend.id !== friendId);
      setFriends(updatedFriends);
      
      // Update cache
      const newCacheData = { ...friendsCache.current.friends };
      delete newCacheData[friendId];
      saveFriendsToCache(newCacheData);
      
      // Update search results if the removed friend is in the current search results
      setSearchResults(prevResults => 
        prevResults.map(user => 
          user.uid === friendId 
            ? { ...user, isFriend: false, requestStatus: 'none', requestId: undefined }
            : user
        )
      );
      
      Alert.alert('Success', 'Friend removed successfully');
    } catch (error) {
      console.error('Error removing friend:', error);
      Alert.alert('Error', 'Failed to remove friend');
    }
  };

  // Add this function to fetch user data
  const fetchRequestUserData = async (userId: string) => {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setRequestUserData(prev => ({
          ...prev,
          [userId]: {
            displayName: data.displayName || 'Unknown',
            photoURL: data.photoURL || null
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Render a friend request item
  const renderRequestItem = ({ item }: { item: FriendRequest }) => {
    const isReceived = item.receiverId === userData?.uid;
    const otherUserId = isReceived ? item.senderId : item.receiverId;
    
    // Fetch user data if not already cached
    useEffect(() => {
      if (otherUserId && !requestUserData[otherUserId]) {
        fetchRequestUserData(otherUserId);
      }
    }, [otherUserId]);

    const otherUser = requestUserData[otherUserId];
    
    return (
      <View style={styles.requestItem}>
        <View style={styles.friendAvatar}>
          {otherUser?.photoURL ? (
            <Image source={{ uri: otherUser.photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {otherUser?.displayName?.charAt(0) || '?'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>
            {otherUser?.displayName || 'Loading...'}
          </Text>
          <Text style={styles.requestStatus}>
            {isReceived ? 'Sent you a friend request' : 'Friend request sent'}
          </Text>
        </View>
        
        {isReceived ? (
          <View style={styles.requestActions}>
            <TouchableOpacity 
              style={[styles.requestButton, styles.acceptButton]}
              onPress={() => handleAcceptRequest(item.id!)}
            >
              <Text style={styles.requestButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.requestButton, styles.declineButton]}
              onPress={() => handleDeclineRequest(item.id!)}
            >
              <Text style={styles.requestButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.requestButton, styles.cancelButton]}
            onPress={() => handleCancelRequest(item.id!)}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="close-circle" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.requestButtonText}>Cancel</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render a search result item
  const renderSearchResultItem = ({ item }: { item: UserSearchResult }) => {
    console.log('Rendering search result item:', item);
    return (
    <View style={styles.searchResultItem}>
      <View style={styles.friendAvatar}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.displayName}</Text>
      </View>
      
      {item.isFriend ? (
        <TouchableOpacity 
          style={[styles.requestButton, styles.removeButton]}
          onPress={() => {
            Alert.alert(
              'Remove Friend',
              `Are you sure you want to remove ${item.displayName} from your friends?`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => handleRemoveFriend(item.uid)
                }
              ]
            );
          }}
        >
          <Text style={styles.requestButtonText}>Remove</Text>
        </TouchableOpacity>
      ) : (
        <>
          {(!item.requestStatus || item.requestStatus === 'none') && (
            <TouchableOpacity 
              style={[styles.requestButton, styles.sendButton]}
              onPress={() => handleSendFriendRequest(item.uid)}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="person-add" size={16} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.requestButtonText}>Add</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {item.requestStatus === 'sent' && (
            <TouchableOpacity 
              style={[styles.requestButton, styles.cancelButton]}
              onPress={() => {
                console.log('Cancel button pressed for:', item);
                if (item.requestId) {
                  handleCancelRequest(item.requestId);
                } else {
                  console.error('No requestId found for item:', item);
                  Alert.alert('Error', 'Could not cancel request - missing request ID');
                }
              }}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="close-circle" size={16} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.requestButtonText}>Cancel</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {item.requestStatus === 'received' && (
            <View style={styles.requestActions}>
              <TouchableOpacity 
                style={[styles.requestButton, styles.acceptButton]}
                onPress={() => item.requestId && handleAcceptRequest(item.requestId)}
              >
                <Text style={styles.requestButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.requestButton, styles.declineButton]}
                onPress={() => item.requestId && handleDeclineRequest(item.requestId)}
              >
                <Text style={styles.requestButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  )};

  // Add a function to handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    const refreshStartTime = Date.now();
    console.log(`Manual refresh on ${activeTab} tab`);
    
    try {
      if (activeTab === 'requests') {
        await fetchFriendRequests(true); // Force refresh by bypassing cache
      } else {
        // First refresh Firebase data without disturbing existing status listeners
        await fetchFriends(true); // Force refresh by bypassing cache
        
        // Then quietly update the status data in the background without resetting UI
        const statusRef = ref(database, 'status');
        const snapshot = await get(statusRef);
        if (snapshot.exists()) {
          const statusData = snapshot.val() || {};
          
          // Update friend statuses without triggering UI flicker
          const updatedFriendsData = { ...friendsCache.current.friends };
          let hasUpdates = false;
          
          Object.keys(updatedFriendsData).forEach(friendId => {
            // Skip if this friendId doesn't exist in our data (might have been removed)
            if (!updatedFriendsData[friendId]) return;
            
            const friendStatus = statusData[friendId];
            if (friendStatus) {
              const isOnline = Boolean(friendStatus.online || friendStatus.isOnline);
              const isShitting = Boolean(friendStatus.isShitting);
              
              if (
                updatedFriendsData[friendId].isOnline !== isOnline ||
                updatedFriendsData[friendId].isShitting !== isShitting
              ) {
                updatedFriendsData[friendId] = {
                  ...updatedFriendsData[friendId],
                  isOnline,
                  isShitting
                };
                hasUpdates = true;
              }
            }
          });
          
          // Only update state if there were actual changes
          if (hasUpdates) {
            console.log('Status updates detected during refresh - updating UI');
            friendsCache.current.friends = updatedFriendsData;
            setFriends(Object.values(updatedFriendsData));
          }
        }
      }
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      // Ensure refreshing is shown for at least 1 second
      const elapsedTime = Date.now() - refreshStartTime;
      if (elapsedTime < 1000) {
        setTimeout(() => {
          setRefreshing(false);
        }, 1000 - elapsedTime);
      } else {
        setRefreshing(false);
      }
    }
  };

  // Prepare sections data for requests tab
  const getRequestSections = (): RequestSection[] => {
    return [
      {
        title: 'Received Requests',
        data: receivedRequests,
        icon: 'arrow-down-circle-outline',
        emptyText: 'No received requests'
      },
      {
        title: 'Sent Requests',
        data: sentRequests,
        icon: 'arrow-up-circle-outline',
        emptyText: 'No sent requests'
      }
    ];
  };

  // Render section header for requests
  const renderSectionHeader = ({ section }: { section: RequestSection }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons name={section.icon} size={20} color="#374151" style={styles.sectionIcon} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  // Render empty component for sections
  const renderSectionEmpty = ({ section }: { section: RequestSection }) => (
    <View style={styles.sectionEmptyContainer}>
      <Text style={styles.sectionEmptyText}>{section.emptyText}</Text>
    </View>
  );

  // Handle tab change
  const handleTabChange = (tab: string) => {
    console.log(`Switching to tab: ${tab}`);
    
    // Set active tab immediately to update UI
    setActiveTab(tab);
    
    // Clear any search
    setSearchQuery('');
    
    // If we're switching to a tab that already has data loaded, don't trigger loading
    const hasData = tab === 'requests' 
      ? (receivedRequests.length > 0 || sentRequests.length > 0) 
      : friends.length > 0;
    
    // When switching to online tab, we should check for status updates
    if (tab === 'online') {
      console.log('SWITCHING TO ONLINE TAB - Current friends online status:');
      
      // Show a summary of who is online
      const onlineFriends = friends.filter(f => f.isOnline === true);
      if (onlineFriends.length > 0) {
        console.log(`👋 SUMMARY: ${onlineFriends.length} friends currently online:`);
        onlineFriends.forEach(f => console.log(`  - ${f.displayName}`));
      } else {
        console.log('❌ No friends currently online according to state');
      }
      
      // Instead of rebuilding the listeners which causes flickering,
      // quietly refresh status data without disturbing the UI
      if (friends.length > 0) {
        // Background refresh status data without changing the UI
        get(ref(database, 'status'))
          .then(snapshot => {
            if (snapshot.exists()) {
              const statusData = snapshot.val() || {};
              let hasUpdates = false;
              const updatedFriendsData = { ...friendsCache.current.friends };
              
              Object.keys(updatedFriendsData).forEach(friendId => {
                // Skip if this friendId doesn't exist in our data (might have been removed)
                if (!updatedFriendsData[friendId]) return;
                
                if (statusData[friendId]) {
                  const isOnline = Boolean(statusData[friendId].online || statusData[friendId].isOnline);
                  const isShitting = Boolean(statusData[friendId].isShitting);
                  
                  if (
                    updatedFriendsData[friendId].isOnline !== isOnline ||
                    updatedFriendsData[friendId].isShitting !== isShitting
                  ) {
                    updatedFriendsData[friendId] = {
                      ...updatedFriendsData[friendId],
                      isOnline,
                      isShitting
                    };
                    hasUpdates = true;
                  }
                }
              });
              
              if (hasUpdates) {
                friendsCache.current.friends = updatedFriendsData;
                setFriends(Object.values(updatedFriendsData));
              }
            }
          })
          .catch(error => {
            console.error('Error fetching status data:', error);
          });
      }
    }
    
    // When switching to shitting tab, force-check all friends' statuses
    if (tab === 'shitting') {
      console.log('SWITCHING TO SHITTING TAB - Current friends status:');
      friends.forEach(friend => {
        console.log(`- ${friend.displayName}: isShitting=${friend.isShitting}, isOnline=${friend.isOnline}`);
      });
      
      // Show a summary of who is shitting
      const shittingFriends = friends.filter(f => f.isShitting === true);
      if (shittingFriends.length > 0) {
        console.log(`🚽 SUMMARY: ${shittingFriends.length} friends currently shitting:`);
        shittingFriends.forEach(f => console.log(`  - ${f.displayName}`));
      } else {
        console.log('❌ No friends currently shitting according to state');
      }
    }
    
    // Only refetch data if we don't have it already or it might be stale
    const shouldRefetch = !hasData || 
      (Date.now() - friendsCache.current.lastUpdated > CACHE_DURATION) ||
      (tab === 'requests' && Date.now() - requestsCache.current.lastUpdated > CACHE_DURATION);
    
    if (shouldRefetch && userData?.uid) {
      console.log(`Loading data for ${tab} tab`);
      if (tab !== 'requests') {
        fetchFriends();
      } else {
        fetchFriendRequests();
      }
    } else {
      console.log(`Using existing data for ${tab} tab`);
    }
  }

  // Log when friends list changes
  useEffect(() => {
    console.log('Friends list updated', {
      count: friends.length,
      online: friends.filter(f => f.isOnline).length,
      shitting: friends.filter(f => f.isShitting).length
    });
  }, [friends]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setAddFriendsModalVisible(true)}
        >
          <Ionicons name="person-add" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => handleTabChange('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'online' && styles.activeTab]}
          onPress={() => handleTabChange('online')}
        >
          <Text style={[styles.tabText, activeTab === 'online' && styles.activeTabText]}>Online</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'shitting' && styles.activeTab]}
          onPress={() => handleTabChange('shitting')}
        >
          <Text style={[styles.tabText, activeTab === 'shitting' && styles.activeTabText]}>Shitting</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => handleTabChange('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : activeTab === 'requests' ? (
        <SectionList
          sections={getRequestSections()}
          renderItem={renderRequestItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={({ section }) => section.data.length === 0 ? renderSectionEmpty({ section }) : null}
          keyExtractor={(item) => item.id!}
          style={styles.list}
          contentContainerStyle={styles.requestsContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || requestsLoading}
              onRefresh={handleRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={null}
        />
      ) : (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriendItem}
          keyExtractor={item => item.id}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={60} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No friends match your search' : 'No friends yet'}
              </Text>
              <TouchableOpacity 
                style={styles.addFriendButton}
                onPress={() => setAddFriendsModalVisible(true)}
              >
                <Ionicons name="person-add" size={16} color="#fff" style={styles.addIcon} />
                <Text style={styles.addFriendText}>Add Friends</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add Friends Modal */}
      <Modal
        visible={addFriendsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddFriendsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Friends</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => {
                    setAddFriendsModalVisible(false);
                    setUserSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalSearchContainer}>
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search by name..."
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={handleSearchUsers}
                />
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={handleSearchUsers}
                  disabled={searching || !userSearchQuery.trim()}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.searchButtonText}>Search</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResultItem}
                  keyExtractor={item => item.uid}
                  contentContainerStyle={styles.searchResultsList}
                />
              ) : (
                <View style={styles.noResultsContainer}>
                  {userSearchQuery && !searching ? (
                    <>
                      <Ionicons name="search" size={40} color="#d1d5db" />
                      <Text style={styles.noResultsText}>No users found</Text>
                    </>
                  ) : !userSearchQuery ? (
                    <>
                      <Ionicons name="people" size={40} color="#d1d5db" />
                      <Text style={styles.noResultsText}>Search for users to add</Text>
                    </>
                  ) : null}
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
  friendsList: {
    paddingHorizontal: 15,
  },
  friendItem: {
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
  friendAvatar: {
    position: 'relative',
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineIndicator: {
    backgroundColor: '#10b981',
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  shittingIndicator: {
    backgroundColor: '#ef4444',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  friendStatus: {
    fontSize: 14,
    color: '#6b7280',
  },
  messageButton: {
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 10,
    marginBottom: 20,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  addIcon: {
    marginRight: 5,
  },
  addFriendText: {
    color: '#fff',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: Platform.OS === 'ios' ? '80%' : '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  modalSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchResultsList: {
    paddingBottom: 20,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  addButton: {
    padding: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 10,
  },
  requestsContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  requestsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#f9fafb',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionEmptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionEmptyText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  requestsContent: {
    paddingHorizontal: 15,
    paddingTop: 8,
  },
  requestItem: {
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
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  requestButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#6366f1',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  requestButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  requestStatus: {
    fontSize: 14,
    color: '#6b7280',
  },
  friendBadge: {
    backgroundColor: '#10b981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  friendBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    padding: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 4,
  },
  cancelButton: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
}); 