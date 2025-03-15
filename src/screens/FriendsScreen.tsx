import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
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

  // Fetch friend requests
  const fetchFriendRequests = async () => {
    if (!userData?.uid) return;
    
    setRequestsLoading(true);
    try {
      const [received, sent] = await Promise.all([
        getReceivedFriendRequests(userData.uid),
        getSentFriendRequests(userData.uid)
      ]);
      
      setReceivedRequests(received);
      setSentRequests(sent);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      Alert.alert('Error', 'Failed to load friend requests');
    } finally {
      setRequestsLoading(false);
    }
  };

  // Use fetchFriendRequests in useEffect
  useEffect(() => {
    if (userData?.uid) {
      // Only fetch friend requests if we're on the requests tab
      if (activeTab === 'requests') {
        fetchFriendRequests();
      }
    }
  }, [userData?.uid]); // Remove activeTab from dependencies

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
      // Only fetch friends if we're not on the requests tab
      if (activeTab !== 'requests') {
        fetchFriends();
      }
    }
  }, [userData?.uid]); // Remove activeTab from dependencies
  
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
      
      <TouchableOpacity 
        style={styles.removeButton}
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
        <Ionicons name="person-remove" size={20} color="#ef4444" />
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

      // Also fetch friend requests to ensure our sent requests list is up to date
      await fetchFriendRequests();
      
      Alert.alert('Success', 'Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  // Function to handle accepting a friend request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      
      // Refresh data
      fetchFriendRequests();
      fetchFriends();
      
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
                fetchFriendRequests();
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
      
      // Refresh data
      fetchFriendRequests();
      
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
      
      // Refresh data
      fetchFriendRequests();
      
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

  // Function to handle removing a friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!userData?.uid) return;
    
    try {
      // Remove from current user's friends list
      const userRef = doc(firestore, 'users', userData.uid);
      await updateDoc(userRef, {
        friends: arrayRemove(friendId)
      });
      
      // Remove from friend's friends list
      const friendRef = doc(firestore, 'users', friendId);
      await updateDoc(friendRef, {
        friends: arrayRemove(userData.uid)
      });
      
      // Update UI
      setSearchResults(prevResults => 
        prevResults.map(user => 
          user.uid === friendId 
            ? { ...user, isFriend: false }
            : user
        )
      );
      
      // Refresh friends list
      fetchFriends();
      
      Alert.alert('Success', 'Friend removed successfully');
    } catch (error) {
      console.error('Error removing friend:', error);
      Alert.alert('Error', 'Failed to remove friend. Please try again.');
    }
  };

  // Render a friend request item
  const renderRequestItem = ({ item }: { item: FriendRequest }) => {
    const isReceived = item.receiverId === userData?.uid;
    const otherUserId = isReceived ? item.senderId : item.receiverId;
    
    return (
      <View style={styles.requestItem}>
        <View style={styles.friendAvatar}>
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>?</Text>
          </View>
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>Loading...</Text>
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
            <Text style={styles.requestButtonText}>Cancel</Text>
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
      ) : item.requestStatus === 'none' && (
        <TouchableOpacity 
          style={[styles.requestButton, styles.sendButton]}
          onPress={() => handleSendFriendRequest(item.uid)}
        >
          <Text style={styles.requestButtonText}>Send Request</Text>
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
          <Text style={styles.requestButtonText}>Cancel</Text>
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
    </View>
  )};

  // Function to handle refresh
  const handleRefresh = async () => {
    if (!userData?.uid) return;
    
    setRefreshing(true);
    try {
      // Create an array of promises to execute
      const refreshPromises = [];
      
      // Only refresh data relevant to the active tab
      if (activeTab === 'requests') {
        refreshPromises.push(fetchFriendRequests());
      } else {
        refreshPromises.push(fetchFriends());
      }
      
      // Add search results refresh if modal is open and there's a search query
      if (addFriendsModalVisible && userSearchQuery.trim()) {
        refreshPromises.push(handleSearchUsers());
      }
      
      // Execute all refresh operations in parallel
      await Promise.all(refreshPromises);
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

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

  // Render section header for requests
  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <Text style={styles.sectionTitle}>{section.title}</Text>
  );

  // Prepare sections data for requests tab
  const getRequestSections = () => {
    const sections = [];
    
    if (receivedRequests.length > 0) {
      sections.push({
        title: 'Received Requests',
        data: receivedRequests
      });
    }
    
    if (sentRequests.length > 0) {
      sections.push({
        title: 'Sent Requests',
        data: sentRequests
      });
    }
    
    return sections;
  };

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
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
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
        requestsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : (
          <SectionList
            sections={getRequestSections()}
            renderItem={renderRequestItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id!}
            style={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#6366f1']}
                tintColor="#6366f1"
                progressViewOffset={Platform.OS === 'ios' ? 0 : 20}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="mail" size={60} color="#d1d5db" />
                <Text style={styles.emptyText}>No friend requests</Text>
              </View>
            }
          />
        )
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
              progressViewOffset={Platform.OS === 'ios' ? 0 : 20}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  requestsList: {
    paddingBottom: 10,
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
  cancelButton: {
    backgroundColor: '#6b7280',
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
    padding: 10,
  },
  list: {
    flex: 1,
    paddingHorizontal: 15,
  },
}); 