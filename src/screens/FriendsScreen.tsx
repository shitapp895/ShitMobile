import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { firestore, database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface FriendData {
  id: string;
  displayName: string;
  photoURL: string | null;
  isOnline: boolean;
  isShitting: boolean;
}

export default function FriendsScreen() {
  const { userData } = useAuth();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'online', 'shitting'
  
  // Fetch friends data
  useEffect(() => {
    if (!userData?.uid) return;
    
    const fetchFriends = async () => {
      setLoading(true);
      
      try {
        // Get current user's friends list
        const userDocRef = doc(firestore, 'users', userData.uid);
        const userDoc = await getDoc(userDocRef);
        const friendIds = userDoc.data()?.friends || [];
        
        if (friendIds.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }
        
        // Create an object to store friend data
        const friendsData: { [key: string]: FriendData } = {};
        
        // Fetch each friend's data from Firestore
        for (const friendId of friendIds) {
          const friendDocRef = doc(firestore, 'users', friendId);
          const friendDoc = await getDoc(friendDocRef);
          
          if (friendDoc.exists()) {
            const data = friendDoc.data();
            friendsData[friendId] = {
              id: friendId,
              displayName: data.displayName || 'Unknown',
              photoURL: data.photoURL,
              isOnline: data.isOnline || false,
              isShitting: data.isShitting || false,
            };
          }
        }
        
        // Set up listeners for online status from Realtime Database
        const statusRefs = friendIds.map(friendId => ref(database, `status/${friendId}`));
        
        statusRefs.forEach((statusRef, index) => {
          const friendId = friendIds[index];
          
          onValue(statusRef, (snapshot) => {
            const status = snapshot.val();
            
            if (status && friendsData[friendId]) {
              friendsData[friendId].isOnline = status.state === 'online';
              setFriends(Object.values(friendsData));
            }
          });
        });
        
        // Initial set of friends
        setFriends(Object.values(friendsData));
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFriends();
  }, [userData?.uid]);
  
  // Filter friends based on search query and active tab
  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'online') return matchesSearch && friend.isOnline;
    if (activeTab === 'shitting') return matchesSearch && friend.isShitting;
    
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
      
      <TouchableOpacity style={styles.messageButton}>
        <Ionicons name="chatbubble-outline" size={20} color="#6366f1" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'online' && styles.activeTab]}
          onPress={() => setActiveTab('online')}
        >
          <Text style={[styles.tabText, activeTab === 'online' && styles.activeTabText]}>
            Online
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'shitting' && styles.activeTab]}
          onPress={() => setActiveTab('shitting')}
        >
          <Text style={[styles.tabText, activeTab === 'shitting' && styles.activeTabText]}>
            Shitting
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : filteredFriends.length > 0 ? (
        <FlatList
          data={filteredFriends}
          renderItem={renderFriendItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.friendsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={60} color="#d1d5db" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No friends match your search' : 'No friends yet'}
          </Text>
          <TouchableOpacity style={styles.addFriendButton}>
            <Ionicons name="person-add" size={16} color="#fff" style={styles.addIcon} />
            <Text style={styles.addFriendText}>Add Friends</Text>
          </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
}); 