import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { firestore, database } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { searchUsers, addFriend } from '../services/database/userService';

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
}

export default function FriendsScreen() {
  const { userData } = useAuth();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'online', 'shitting'
  
  // New state for the add friends modal
  const [addFriendsModalVisible, setAddFriendsModalVisible] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);

  // Extract fetchFriends function to reuse it
  const fetchFriends = async () => {
    if (!userData?.uid) return;
    
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
      const statusRefs = friendIds.map((friendId: string) => ref(database, `status/${friendId}`));
      
      statusRefs.forEach((statusRef: any, index: number) => {
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
  
  // Use fetchFriends in the useEffect
  useEffect(() => {
    if (userData?.uid) {
      fetchFriends();
    }
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
  
  // Function to handle searching for users
  const handleSearchUsers = async () => {
    if (!userSearchQuery.trim() || !userData?.uid) return;
    
    setSearching(true);
    try {
      console.log('Searching for users with query:', userSearchQuery);
      const users = await searchUsers(userSearchQuery);
      console.log('Search results:', users);
      
      // Filter out current user and existing friends
      const friendIds = userData.friends || [];
      const filteredUsers = users.filter(user => 
        user.uid !== userData.uid && 
        !friendIds.includes(user.uid)
      );
      
      console.log('Filtered results:', filteredUsers);
      
      // Convert to UserSearchResult format
      const searchResultUsers: UserSearchResult[] = filteredUsers.map(user => ({
        uid: user.uid,
        displayName: user.displayName || 'Unknown',
        photoURL: user.photoURL
      }));
      
      setSearchResults(searchResultUsers);
      
      if (searchResultUsers.length === 0 && users.length > 0) {
        // We found users but they're all filtered out (current user or already friends)
        Alert.alert('No New Friends Found', 'Users matching your search are either already your friends or yourself.');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search for users. Please try again.');
    } finally {
      setSearching(false);
    }
  };
  
  // Function to handle adding a friend
  const handleAddFriend = async (friendId: string) => {
    if (!userData?.uid) return;
    
    setAddingFriend(friendId);
    try {
      await addFriend(userData.uid, friendId);
      
      // Update UI
      setSearchResults(prevResults => 
        prevResults.filter(user => user.uid !== friendId)
      );
      
      // Refresh friends list
      fetchFriends();
      
      Alert.alert('Success', 'Friend added successfully!');
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert('Error', 'Failed to add friend. Please try again.');
    } finally {
      setAddingFriend(null);
    }
  };
  
  // Render a search result item
  const renderSearchResultItem = ({ item }: { item: UserSearchResult }) => (
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
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => handleAddFriend(item.uid)}
        disabled={addingFriend === item.uid}
      >
        {addingFriend === item.uid ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="person-add" size={16} color="#fff" style={styles.addIcon} />
            <Text style={styles.addButtonText}>Add</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Set up the header right button
  useEffect(() => {
    // If this component is used in a screen with navigation, you'd use this approach:
    // navigation.setOptions({
    //   headerRight: () => (
    //     <TouchableOpacity 
    //       style={{ marginRight: 15 }} 
    //       onPress={() => setAddFriendsModalVisible(true)}
    //     >
    //       <Ionicons name="person-add" size={24} color="#6366f1" />
    //     </TouchableOpacity>
    //   ),
    // });
  }, []);

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
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'online' && styles.activeTab]}
          onPress={() => setActiveTab('online')}
        >
          <Text style={[styles.tabText, activeTab === 'online' && styles.activeTabText]}>Online</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'shitting' && styles.activeTab]}
          onPress={() => setActiveTab('shitting')}
        >
          <Text style={[styles.tabText, activeTab === 'shitting' && styles.activeTabText]}>Shitting</Text>
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
          <TouchableOpacity 
            style={styles.addFriendButton}
            onPress={() => setAddFriendsModalVisible(true)}
          >
            <Ionicons name="person-add" size={16} color="#fff" style={styles.addIcon} />
            <Text style={styles.addFriendText}>Add Friends</Text>
          </TouchableOpacity>
        </View>
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
}); 