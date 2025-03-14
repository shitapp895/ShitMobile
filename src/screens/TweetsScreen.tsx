import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, addDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { firestore, database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface Tweet {
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

export default function TweetsScreen() {
  const { userData } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTweet, setNewTweet] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [deletingTweetId, setDeletingTweetId] = useState<string | null>(null);
  
  // Fetch tweets with real-time updates
  useEffect(() => {
    const tweetsQuery = query(
      collection(firestore, 'tweets'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    // Set up real-time listener for tweets
    const unsubscribe = onSnapshot(tweetsQuery, async (querySnapshot) => {
      try {
        const tweetsList: Tweet[] = [];
        
        for (const document of querySnapshot.docs) {
          const tweetData = document.data();
          
          // Skip documents with no authorId
          if (!tweetData.authorId) continue;
          
          // Get author info
          const authorDocRef = doc(firestore, 'users', tweetData.authorId);
          const authorDoc = await getDoc(authorDocRef);
          const authorData = authorDoc.exists() ? authorDoc.data() : {};
          
          const tweet = {
            id: document.id,
            authorId: tweetData.authorId,
            authorName: authorData.displayName || 'Unknown User',
            authorPhotoURL: authorData.photoURL || null,
            content: tweetData.content,
            timestamp: tweetData.timestamp,
            likes: tweetData.likes || 0,
            isShitting: authorData.isShitting || false,
          };
          
          tweetsList.push(tweet);
          
          // Setup individual status listeners for each author
          setupStatusListener(tweet.authorId, tweetsList);
        }
        
        setTweets(tweetsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tweets:', error);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error in tweets listener:", error);
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
      // Clean up all status listeners
      Object.values(statusListeners).forEach(unsubscribe => unsubscribe());
    };
  }, []);
  
  // Setup a status listener for an individual author
  const setupStatusListener = (authorId: string, tweetsList: Tweet[]) => {
    // Skip if we already have a listener for this author
    if (statusListeners[authorId]) return;
    
    // Set up listener for this author's status
    const statusRef = ref(database, `status/${authorId}`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.val() || {};
      
      // Update tweets for this author with new status
      setTweets(currentTweets => 
        currentTweets.map(tweet => 
          tweet.authorId === authorId 
            ? { ...tweet, isShitting: status.isShitting || false } 
            : tweet
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
  
  // Post a new tweet
  const handlePostTweet = useCallback(async () => {
    if (!userData?.uid || !newTweet.trim()) return;
    
    setSubmitting(true);
    Keyboard.dismiss();
    
    try {
      console.log("Posting tweet:", newTweet.trim());
      
      await addDoc(collection(firestore, 'tweets'), {
        authorId: userData.uid,
        content: newTweet.trim(),
        timestamp: serverTimestamp(),
        likes: 0,
        likedBy: [],
      });
      
      // Clear input
      setNewTweet('');
      console.log("Tweet posted successfully");
    } catch (error) {
      console.error('Error posting tweet:', error);
    } finally {
      setSubmitting(false);
    }
  }, [userData, newTweet]);
  
  // Format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const date = timestamp.toDate();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Add function to delete a tweet
  const handleDeleteTweet = useCallback(async (tweetId: string) => {
    if (!userData?.uid) return;
    
    // Find the tweet to confirm it belongs to the current user
    const tweetToDelete = tweets.find(tweet => tweet.id === tweetId);
    
    if (!tweetToDelete) {
      console.error('Tweet not found');
      return;
    }
    
    // Verify the tweet belongs to the current user
    if (tweetToDelete.authorId !== userData.uid) {
      console.error('Cannot delete someone else\'s tweet');
      Alert.alert('Error', 'You can only delete your own tweets');
      return;
    }
    
    // Confirm deletion with user
    Alert.alert(
      'Delete Tweet',
      'Are you sure you want to delete this tweet?',
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
              setDeletingTweetId(tweetId);
              
              // Delete the tweet document from Firestore
              await deleteDoc(doc(firestore, 'tweets', tweetId));
              console.log('Tweet deleted successfully');
              
              // Update local state to remove the deleted tweet
              setTweets(currentTweets => 
                currentTweets.filter(tweet => tweet.id !== tweetId)
              );
            } catch (error) {
              console.error('Error deleting tweet:', error);
              Alert.alert('Error', 'Failed to delete tweet. Please try again.');
            } finally {
              setDeletingTweetId(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [tweets, userData]);
  
  // Render a tweet
  const renderTweetItem = ({ item }: { item: Tweet }) => (
    <View style={styles.tweetCard}>
      <View style={styles.tweetHeader}>
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
        
        {/* Delete button - only shown for user's own tweets */}
        {userData?.uid === item.authorId && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteTweet(item.id)}
            disabled={deletingTweetId === item.id}
          >
            {deletingTweetId === item.id ? (
              <ActivityIndicator size="small" color="#f87171" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#f87171" />
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.tweetContent}>{item.content}</Text>
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
              value={newTweet}
              onChangeText={setNewTweet}
            />
          </View>
          
          <TouchableOpacity 
            style={[
              styles.postButton,
              (!newTweet.trim() || submitting) && styles.disabledButton
            ]}
            onPress={handlePostTweet}
            disabled={!newTweet.trim() || submitting}
          >
            <Text style={styles.postButtonText}>
              {submitting ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading tweets...</Text>
          </View>
        ) : tweets.length > 0 ? (
          <FlatList
            data={tweets}
            renderItem={renderTweetItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.tweetsList}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses" size={60} color="#d1d5db" />
            <Text style={styles.emptyText}>No tweets yet</Text>
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
  tweetsList: {
    padding: 15,
  },
  tweetCard: {
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
  tweetHeader: {
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
  tweetContent: {
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