import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase/config';
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

export default function TweetsScreen() {
  const { userData } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTweet, setNewTweet] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch tweets
  useEffect(() => {
    const fetchTweets = async () => {
      setLoading(true);
      
      try {
        // Get tweets from Firestore
        const tweetsQuery = query(
          collection(firestore, 'tweets'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        
        const querySnapshot = await getDocs(tweetsQuery);
        const tweetsList: Tweet[] = [];
        
        for (const doc of querySnapshot.docs) {
          const tweetData = doc.data();
          
          // Get author info
          const authorDoc = await getDoc(doc(firestore, 'users', tweetData.authorId));
          const authorData = authorDoc.exists() ? authorDoc.data() : null;
          
          tweetsList.push({
            id: doc.id,
            authorId: tweetData.authorId,
            authorName: authorData?.displayName || 'Unknown User',
            authorPhotoURL: authorData?.photoURL || null,
            content: tweetData.content,
            timestamp: tweetData.timestamp,
            likes: tweetData.likes || 0,
            isShitting: authorData?.isShitting || false,
          });
        }
        
        setTweets(tweetsList);
      } catch (error) {
        console.error('Error fetching tweets:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTweets();
  }, []);
  
  // Post a new tweet
  const handlePostTweet = async () => {
    if (!userData?.uid || !newTweet.trim()) return;
    
    setSubmitting(true);
    
    try {
      await addDoc(collection(firestore, 'tweets'), {
        authorId: userData.uid,
        content: newTweet.trim(),
        timestamp: serverTimestamp(),
        likes: 0,
        likedBy: [],
      });
      
      // Clear input and refresh tweets
      setNewTweet('');
      // In a real app, you would either fetch tweets again or add the new tweet to the state
    } catch (error) {
      console.error('Error posting tweet:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const tweetDate = timestamp.toDate();
    const diffMs = now.getTime() - tweetDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return tweetDate.toLocaleDateString();
  };
  
  // Render tweet item
  const renderTweetItem = ({ item }: { item: Tweet }) => (
    <View style={styles.tweetItem}>
      <View style={styles.tweetHeader}>
        <View style={styles.authorContainer}>
          {item.authorPhotoURL ? (
            <Image source={{ uri: item.authorPhotoURL }} style={styles.authorAvatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>{item.authorName.charAt(0)}</Text>
            </View>
          )}
          
          <View>
            <Text style={styles.authorName}>{item.authorName}</Text>
            <Text style={styles.tweetTime}>{formatTimestamp(item.timestamp)}</Text>
          </View>
        </View>
        
        {item.isShitting && (
          <View style={styles.shittingBadge}>
            <Ionicons name="water" size={12} color="#fff" />
            <Text style={styles.shittingText}>Shitting</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.tweetContent}>{item.content}</Text>
      
      <View style={styles.tweetActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={20} color="#6b7280" />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-social-outline" size={20} color="#6b7280" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.composeContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="What's happening?"
            value={newTweet}
            onChangeText={setNewTweet}
            multiline
            maxLength={280}
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
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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
  tweetsList: {
    padding: 15,
  },
  tweetItem: {
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
    alignItems: 'center',
    marginBottom: 10,
  },
  authorContainer: {
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tweetTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  shittingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  shittingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tweetContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 15,
  },
  tweetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 5,
  },
}); 