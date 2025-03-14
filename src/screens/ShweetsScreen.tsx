import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, addDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { firestore, database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface Shweet {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  timestamp: any;
  likes: number;
  isShitting: boolean;
}

// Object to store status listeners
const statusListeners: {[key: string]: () => void} = {};

export default function ShweetsScreen() {
  const { userData } = useAuth();
  const [shweets, setShweets] = useState<Shweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newShweet, setNewShweet] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [deletingShweetId, setDeletingShweetId] = useState<string | null>(null);
  
  // Fetch shweets with real-time updates
  useEffect(() => {
    const shweetsQuery = query(
      collection(firestore, 'tweets'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    // Set up real-time listener for shweets
    const unsubscribe = onSnapshot(shweetsQuery, async (querySnapshot) => {
      try {
        const shweetsList: Shweet[] = [];
        
        for (const document of querySnapshot.docs) {
          const shweetData = document.data();
          
          // Skip documents with no authorId
          if (!shweetData.authorId) continue;
          
          // Get author info
          const authorDocRef = doc(firestore, 'users', shweetData.authorId);
          const authorDoc = await getDoc(authorDocRef);
          const authorData = authorDoc.exists() ? authorDoc.data() : {};
          
          const shweet = {
            id: document.id,
            authorId: shweetData.authorId,
            authorName: authorData.displayName || 'Unknown User',
            authorPhotoURL: authorData.photoURL || null,
            content: shweetData.content,
            timestamp: shweetData.timestamp,
            likes: shweetData.likes || 0,
            isShitting: authorData.isShitting || false,
          };
          
          shweetsList.push(shweet);
          
          // Setup individual status listeners for each author
          setupStatusListener(shweet.authorId, shweetsList);
        }
        
        setShweets(shweetsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching shweets:', error);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error in shweets listener:", error);
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
      // Clean up all status listeners
      Object.values(statusListeners).forEach(unsubscribe => unsubscribe());
    };
  }, []);
  
  // Setup a status listener for an individual author
  const setupStatusListener = (authorId: string, shweetsList: Shweet[]) => {
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
        likes: 0,
        likedBy: [],
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
  
  // Render a shweet
  const renderShweetItem = ({ item }: { item: Shweet }) => (
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
        
        {/* Delete button - only shown for user's own shweets */}
        {userData?.uid === item.authorId && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteShweet(item.id)}
            disabled={deletingShweetId === item.id}
          >
            {deletingShweetId === item.id ? (
              <ActivityIndicator size="small" color="#f87171" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.shweetContent}>{item.content}</Text>
    </View>
  );
  
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <View style={styles.composeContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="What's happening on the toilet?"
              multiline
              value={newShweet}
              onChangeText={setNewShweet}
            />
          </View>
          
          <TouchableOpacity 
            style={[
              styles.postButton,
              (!newShweet.trim() || submitting) && styles.disabledButton
            ]}
            onPress={handlePostShweet}
            disabled={!newShweet.trim() || submitting}
          >
            <Text style={styles.postButtonText}>
              {submitting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading shweets...</Text>
          </View>
        ) : shweets.length > 0 ? (
          <FlatList
            data={shweets}
            renderItem={renderShweetItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.shweetsList}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses" size={60} color="#d1d5db" />
            <Text style={styles.emptyText}>No shweets yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  composeContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  inputContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  input: {
    minHeight: 60,
    fontSize: 16,
  },
  postButton: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'flex-end',
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  deleteButton: {
    padding: 8,
    borderRadius: 20,
  },
}); 