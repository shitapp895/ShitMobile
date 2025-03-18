import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserSearch } from '../../hooks/useUserSearch';
import { UserSearchResult } from '../../types/friend';

interface FriendSearchSectionProps {
  userId: string;
  onSendRequest: (otherUserId: string) => Promise<void>;
  onCancelRequest: (requestId: string) => Promise<void>;
}

const FriendSearchSection: React.FC<FriendSearchSectionProps> = ({
  userId,
  onSendRequest,
  onCancelRequest,
}) => {
  const {
    searchQuery,
    searchResults,
    searching,
    addingFriend,
    handleSearchUsers,
    clearSearch,
  } = useUserSearch(userId);

  const renderSearchResult = ({ item }: { item: UserSearchResult }) => {
    const { id, displayName, photoURL, pendingRequestId } = item;
    
    return (
      <View style={styles.resultItem}>
        <View style={styles.userAvatar}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{displayName}</Text>
        </View>
        
        {pendingRequestId ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            disabled={addingFriend === id}
            onPress={() => onCancelRequest(pendingRequestId)}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="close-circle" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Cancel</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            disabled={addingFriend === id}
            onPress={() => onSendRequest(id)}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="add-circle" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Add</Text>
            </View>
          </TouchableOpacity>
        )}
        
        {addingFriend === id && (
          <ActivityIndicator
            size="small"
            color="#fff"
            style={styles.loadingIndicator}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Add Friends</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8e8e93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or email"
          placeholderTextColor="#8e8e93"
          value={searchQuery}
          onChangeText={(text) => text.length === 0 && clearSearch()}
          onSubmitEditing={(e) => handleSearchUsers(e.nativeEvent.text)}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <Ionicons name="close-circle" size={20} color="#8e8e93" />
          </TouchableOpacity>
        )}
      </View>
      
      {searching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6466f1" />
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={32} color="#8e8e93" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff1f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1c1c1e',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  resultsList: {
    paddingBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userAvatar: {
    marginRight: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
  },
  defaultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6466f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#34c759',
  },
  cancelButton: {
    backgroundColor: '#8e8e93',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
});

export default FriendSearchSection; 