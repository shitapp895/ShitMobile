import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image, TouchableWithoutFeedback, Keyboard, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, addDoc, serverTimestamp, onSnapshot, deleteDoc, updateDoc, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { firestore, database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { logFriendsRelationship } from '../services/database/userService';

interface Shweet {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  timestamp: any;
  likes: string[]; // Array of user IDs who liked this shweet
  isShitting: boolean;
}

// Object to store status listeners
const statusListeners: {[key: string]: () => void} = {};

// Format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'Just now';
  
  const now = new Date();
  const date = timestamp.toDate();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'less than 1 min';
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Create a memoized ShweetItem component to prevent unnecessary re-renders
const ShweetItem = memo(({ item, onLike, onDelete, currentUserId, isDeleting }: { 
  item: Shweet, 
  onLike: (id: string) => void, 
  onDelete: (id: string) => void, 
  currentUserId: string | undefined,
  isDeleting: boolean
}) => {
  const userHasLiked = item.likes.includes(currentUserId || '');
  
  return (
    <View style={styles.shweetCard}>
      <View style={styles.shweetHeader}>
        <View style={styles.authorInfo}>
          {item.authorPhotoURL ? (
            <Image source={{ uri: item.authorPhotoURL }} style={styles.authorAvatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>{item.authorName.charAt(0)}</Text>
            </View>
          )}
          <View>
            <Text style={styles.authorName}>{item.authorName}</Text>
            <View style={styles.statusContainer}>
              {item.isShitting && (
                <View style={styles.shittingBadge}>
                  <Ionicons name="water" size={12} color="#fff" />
                  <Text style={styles.shittingText}>Shitting</Text>
                </View>
              )}
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          {/* Like button - no loading indicator, immediate feedback */}
          <TouchableOpacity 
            style={styles.likeButton}
            onPress={() => onLike(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.likeContainer}>
              <Ionicons 
                name={userHasLiked ? "heart" : "heart-outline"} 
                size={18} 
                color={userHasLiked ? "#6366f1" : "#6b7280"} 
              />
              <Text style={styles.likeCount}>{item.likes.length}</Text>
            </View>
          </TouchableOpacity>
          
          {/* Delete button - only shown for user's own shweets */}
          {currentUserId === item.authorId && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => onDelete(item.id)}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#f87171" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#f87171" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text style={styles.shweetContent}>{item.content}</Text>
    </View>
  );
});

export default function ShweetsScreen() {
  const { userData } = useAuth();
  const [shweets, setShweets] = useState<Shweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newShweet, setNewShweet] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [deletingShweetId, setDeletingShweetId] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  // Track which shweets have had local like changes to prevent Firestore from overriding
  const localLikeUpdates = useRef<{[shweetId: string]: string[]}>({});
  
  // Fetch friends list once when component mounts
  useEffect(() => {
    if (userData?.uid) {
      // Fetch friends and shweets on initial load
      fetchFriendsAndShweets();
    }
  }, [userData?.uid]);
  
  // Combined function to fetch friends and then shweets
  const fetchFriendsAndShweets = async () => {
    if (!userData?.uid) return;
    
    try {
      console.log(`Fetching friends list for user ${userData.uid}`);
      const userDocRef = doc(firestore, 'users', userData.uid);
      const userDoc = await getDoc(userDocRef);
      
      let friends: string[] = [];
      if (userDoc.exists()) {
        const userDocData = userDoc.data();
        console.log('User document data:', userDocData);
        friends = userDocData.friends || [];
        console.log(`Friends list retrieved with ${friends.length} friends:`, friends);
        
        // Update state
        setFriendsList(friends);
        
        // Immediately fetch shweets using the freshly fetched friends list
        fetchShweetsWithFriends(friends);
      } else {
        console.log('User document does not exist');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching friends list:', error);
      setLoading(false);
    }
  };
  
  // Fetch friends list (used for refresh)
  const fetchFriendsList = async () => {
    if (!userData?.uid) return;
    
    try {
      console.log(`Fetching friends list for user ${userData.uid}`);
      const userDocRef = doc(firestore, 'users', userData.uid);
      const userDoc = await getDoc(userDocRef);
      
      let friends: string[] = [];
      if (userDoc.exists()) {
        const userDocData = userDoc.data();
        console.log('User document data:', userDocData);
        friends = userDocData.friends || [];
        console.log(`Friends list retrieved with ${friends.length} friends:`, friends);
        setFriendsList(friends);
        return friends;
      } else {
        console.log('User document does not exist');
        return [];
      }
    } catch (error) {
      console.error('Error fetching friends list:', error);
      return [];
    }
  };
  
  // Add cleanup for listeners in an effect hook
  useEffect(() => {
    return () => {
      // Clean up all status listeners
      Object.values(statusListeners).forEach(unsubscribe => unsubscribe());
    };
  }, []);
  
  // Fetch shweets with specific friends list
  const fetchShweetsWithFriends = useCallback((friendsIds: string[]) => {
    if (!userData?.uid) return;
    
    console.log(`Fetching shweets for user ${userData.uid}`);
    console.log('Using friends list:', friendsIds);
    
    const shweetsQuery = query(
      collection(firestore, 'tweets'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    // Set up real-time listener for shweets
    const unsubscribe = onSnapshot(shweetsQuery, async (querySnapshot) => {
      try {
        console.log(`Got ${querySnapshot.docs.length} shweets from Firestore`);
        
        // Get current shweets to maintain existing ones during update
        const currentShweetIds = new Map(
          shweets.map(shweet => [shweet.id, shweet])
        );
        
        const shweetsList: Shweet[] = [];
        
        for (const document of querySnapshot.docs) {
          const shweetData = document.data();
          
          // Skip documents with no authorId
          if (!shweetData.authorId) {
            console.log(`Skipping shweet ${document.id} - no authorId`);
            continue;
          }
          
          console.log(`Processing shweet ${document.id} by author ${shweetData.authorId}`);
          
          // Only show shweets from friends and the user's own shweets
          if (shweetData.authorId !== userData.uid && 
              !friendsIds.includes(shweetData.authorId)) {
            console.log(`Skipping shweet ${document.id} - author not in friends list`);
            continue;
          }
          
          // Get author info - check if we already have it to avoid unnecessary fetches
          let authorName = 'Unknown User';
          let authorPhotoURL = null;
          let isShitting = false;
          let likes = shweetData.likes || [];
          
          const existingShweet = currentShweetIds.get(document.id);
          
          // Use local like updates if we have them for this shweet
          if (localLikeUpdates.current[document.id]) {
            likes = localLikeUpdates.current[document.id];
          }
          
          if (existingShweet && existingShweet.authorId === shweetData.authorId) {
            // Reuse author info from existing shweet
            authorName = existingShweet.authorName;
            authorPhotoURL = existingShweet.authorPhotoURL;
            isShitting = existingShweet.isShitting;
            
            // Don't update likes if we have pending local updates
            if (!localLikeUpdates.current[document.id]) {
              likes = existingShweet.likes;
            }
            
            const shweet = {
              id: document.id,
              authorId: shweetData.authorId,
              authorName,
              authorPhotoURL,
              content: shweetData.content,
              timestamp: shweetData.timestamp,
              likes,
              isShitting,
            };
            
            console.log(`Adding existing shweet ${document.id} to list with preserved likes`);
            shweetsList.push(shweet);
          } else {
            // Need to fetch author info
            const authorDocRef = doc(firestore, 'users', shweetData.authorId);
            const authorDoc = await getDoc(authorDocRef);
            const authorData = authorDoc.exists() ? authorDoc.data() : {};
            authorName = authorData.displayName || 'Unknown User';
            authorPhotoURL = authorData.photoURL || null;
            isShitting = authorData.isShitting || false;
            
            const shweet = {
              id: document.id,
              authorId: shweetData.authorId,
              authorName,
              authorPhotoURL,
              content: shweetData.content,
              timestamp: shweetData.timestamp,
              likes,
              isShitting,
            };
            
            console.log(`Adding new shweet ${document.id} to list`);
            shweetsList.push(shweet);
          }
          
          // Setup individual status listeners for each author
          setupStatusListener(shweetData.authorId);
        }
        
        console.log(`Setting state with ${shweetsList.length} shweets`);
        setShweets(shweetsList);
        setLoading(false);
        setRefreshing(false);
      } catch (error) {
        console.error('Error fetching shweets:', error);
        setLoading(false);
        setRefreshing(false);
      }
    }, (error) => {
      console.error("Error in shweets listener:", error);
      setLoading(false);
      setRefreshing(false);
    });
    
    return unsubscribe;
  }, [userData?.uid, shweets]);
  
  // Original fetchShweets function (modified to use latest friends list from state)
  const fetchShweets = useCallback(() => {
    if (!userData?.uid) return;
    // Use non-null assertion to tell TypeScript this is definitely a string[]
    return fetchShweetsWithFriends(friendsList as string[]);
  }, [userData?.uid, friendsList, fetchShweetsWithFriends]);
  
  // Setup a status listener for an individual author
  const setupStatusListener = (authorId: string) => {
    // Skip if we already have a listener for this author
    if (statusListeners[authorId]) return;
    
    // Set up listener for this author's status
    const statusRef = ref(database, `status/${authorId}`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.val() || {};
      
      // Update shweets for this author with new status
      setShweets(currentShweets => 
        currentShweets.map(shweet => 
          shweet.authorId === authorId 
            ? { ...shweet, isShitting: status.isShitting || false } 
            : shweet
        )
      );
    });
    
    // Store the unsubscribe function
    statusListeners[authorId] = unsubscribe;
  };
  
  // Dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  // Post a new shweet
  const handlePostShweet = useCallback(async () => {
    if (!userData?.uid || !newShweet.trim()) return;
    
    setSubmitting(true);
    Keyboard.dismiss();
    
    try {
      console.log("Posting shweet:", newShweet.trim());
      
      await addDoc(collection(firestore, 'tweets'), {
        authorId: userData.uid,
        content: newShweet.trim(),
        timestamp: serverTimestamp(),
        likes: [],
      });
      
      // Clear input
      setNewShweet('');
      console.log("Shweet posted successfully");
    } catch (error) {
      console.error('Error posting shweet:', error);
    } finally {
      setSubmitting(false);
    }
  }, [userData, newShweet]);
  
  // Add function to delete a shweet
  const handleDeleteShweet = useCallback(async (shweetId: string) => {
    if (!userData?.uid) return;
    
    // Find the shweet to confirm it belongs to the current user
    const shweetToDelete = shweets.find(shweet => shweet.id === shweetId);
    
    if (!shweetToDelete) {
      console.error('Shweet not found');
      return;
    }
    
    // Verify the shweet belongs to the current user
    if (shweetToDelete.authorId !== userData.uid) {
      console.error('Cannot delete someone else\'s shweet');
      Alert.alert('Error', 'You can only delete your own shweets');
      return;
    }
    
    // Confirm deletion with user
    Alert.alert(
      'Delete Shweet',
      'Are you sure you want to delete this shweet?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingShweetId(shweetId);
              
              // Delete the shweet document from Firestore
              await deleteDoc(doc(firestore, 'tweets', shweetId));
              console.log('Shweet deleted successfully');
              
              // Update local state to remove the deleted shweet
              setShweets(currentShweets => 
                currentShweets.filter(shweet => shweet.id !== shweetId)
              );
            } catch (error) {
              console.error('Error deleting shweet:', error);
              Alert.alert('Error', 'Failed to delete shweet. Please try again.');
            } finally {
              setDeletingShweetId(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [shweets, userData]);
  
  // Handle like/unlike a shweet
  const handleLikeToggle = useCallback(async (shweetId: string) => {
    if (!userData?.uid) return;
    
    // Find the shweet in our local state
    const shweetIndex = shweets.findIndex(s => s.id === shweetId);
    if (shweetIndex === -1) return;
    
    const shweet = shweets[shweetIndex];
    const userHasLiked = shweet.likes.includes(userData.uid);
    
    // Create the new likes array
    let newLikes: string[];
    if (userHasLiked) {
      // Unlike - filter out user ID
      newLikes = shweet.likes.filter(id => id !== userData.uid);
    } else {
      // Like - add user ID
      newLikes = [...shweet.likes, userData.uid];
    }
    
    // Store this update in our ref to prevent Firestore from overriding it
    localLikeUpdates.current[shweetId] = newLikes;
    
    // Optimistically update UI immediately
    setShweets(currentShweets => {
      const updatedShweets = [...currentShweets];
      const shweetToUpdate = { ...updatedShweets[shweetIndex] };
      shweetToUpdate.likes = newLikes;
      updatedShweets[shweetIndex] = shweetToUpdate;
      return updatedShweets;
    });
    
    try {
      const shweetRef = doc(firestore, 'tweets', shweetId);
      
      if (userHasLiked) {
        // Unlike the shweet - do this in the background
        await updateDoc(shweetRef, {
          likes: arrayRemove(userData.uid)
        });
      } else {
        // Like the shweet - do this in the background
        await updateDoc(shweetRef, {
          likes: arrayUnion(userData.uid)
        });
      }
      
      // After successful update, we can remove the local override
      delete localLikeUpdates.current[shweetId];
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert the optimistic update on error
      delete localLikeUpdates.current[shweetId];
      revertLikeUpdate(shweet, shweetIndex);
    }
  }, [userData, shweets]);
  
  // Helper function to revert like update on error
  const revertLikeUpdate = useCallback((originalShweet: Shweet, shweetIndex: number) => {
    setShweets(currentShweets => {
      const updatedShweets = [...currentShweets];
      if (updatedShweets[shweetIndex]) {
        updatedShweets[shweetIndex] = originalShweet;
      }
      return updatedShweets;
    });
  }, []);
  
  // Check and fix friend relationships if needed
  const checkFriendRelationships = async () => {
    if (!userData?.uid || !friendsList.length) return;
    
    console.log('Checking friend relationships...');
    const fixPromises = friendsList.map(friendId => 
      logFriendsRelationship(userData.uid!, friendId)
    );
    
    try {
      await Promise.all(fixPromises);
      console.log('Friend relationship check completed');
    } catch (error) {
      console.error('Error checking friend relationships:', error);
    }
  };
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Clean up existing listeners
    Object.values(statusListeners).forEach(unsubscribe => unsubscribe());
    // Clear listeners object
    Object.keys(statusListeners).forEach(key => delete statusListeners[key]);
    
    // Fetch friends list and then shweets with the fresh friends list
    fetchFriendsList().then((friends) => {
      // Check friend relationships
      checkFriendRelationships().then(() => {
        // Fetch fresh data with the new friends list
        fetchShweetsWithFriends(friends);
      });
    });
  }, [fetchShweetsWithFriends, userData?.uid]);
  
  // Add a refresh control to the FlatList
  const renderRefreshControl = useCallback(() => {
    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        colors={['#10b981']} // You can use any color that matches your app theme
      />
    );
  }, [refreshing, handleRefresh]);
  
  // Update the main rendering function to use the memoized component
  const renderShweetItem = useCallback(({ item }: { item: Shweet }) => (
    <ShweetItem 
      item={item}
      onLike={handleLikeToggle}
      onDelete={handleDeleteShweet}
      currentUserId={userData?.uid}
      isDeleting={deletingShweetId === item.id}
    />
  ), [handleLikeToggle, handleDeleteShweet, userData?.uid, deletingShweetId]);
  
  return (
    <View style={styles.container}>
      <View style={styles.composeContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Send your friends a Shweet..."
            multiline
            value={newShweet}
            onChangeText={setNewShweet}
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handlePostShweet}
            disabled={submitting || !newShweet.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={shweets}
          keyExtractor={(item) => item.id}
          renderItem={renderShweetItem}
          contentContainerStyle={styles.shweetsList}
          refreshControl={renderRefreshControl()}
          windowSize={5}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  composeContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    fontSize: 16,
    color: '#374151',
    padding: 0,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  shweetsList: {
    padding: 15,
  },
  shweetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  shweetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shittingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
  },
  shittingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  shweetContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 5,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
  },
  likeButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 5,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
}); 