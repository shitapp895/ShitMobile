import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSearchResult } from '../../types/friend';

interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
  searchResults: UserSearchResult[];
  searching: boolean;
  addingFriend: string | null;
  onSearch: (query: string) => void;
  onAddFriend: (userId: string) => void;
  onSendRequest: (userId: string) => void;
  onCancelRequest: (requestId: string) => void;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({ 
  visible, 
  onClose, 
  searchResults, 
  searching, 
  addingFriend, 
  onSearch, 
  onAddFriend, 
  onSendRequest, 
  onCancelRequest 
}) => {
  const [searchInput, setSearchInput] = useState('');

  const renderUserItem = ({ item }: { item: UserSearchResult }) => {
    const isAddingThisUser = addingFriend === item.uid;
    
    return (
      <View style={styles.userItem}>
        <View style={styles.userAvatar}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>{item.displayName.charAt(0)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
        </View>
        
        {isAddingThisUser ? (
          <ActivityIndicator size="small" color="#6366f1" />
        ) : item.isFriend ? (
          <View style={styles.friendBadge}>
            <Ionicons name="people" size={14} color="#fff" style={styles.badgeIcon} />
            <Text style={styles.friendText}>Friends</Text>
          </View>
        ) : item.requestStatus === 'sent' ? (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => item.requestId ? onCancelRequest(item.requestId) : null}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        ) : item.requestStatus === 'received' ? (
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => onAddFriend(item.uid)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => onSendRequest(item.uid)}
          >
            <Ionicons name="person-add" size={16} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Find Friends</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor="#9ca3af"
                value={searchInput}
                onChangeText={setSearchInput}
                onSubmitEditing={() => onSearch(searchInput)}
                returnKeyType="search"
                autoCapitalize="none"
              />
              {searchInput.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => setSearchInput('')}
                >
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            
            {searching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderUserItem}
                keyExtractor={item => item.uid}
                style={styles.list}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={60} color="#d1d5db" />
                <Text style={styles.emptyText}>
                  {searchInput.length > 0 ? 'No results found' : 'Search for friends by name'}
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  clearButton: {
    padding: 5,
  },
  list: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  userAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e5e7eb',
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonIcon: {
    marginRight: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeIcon: {
    marginRight: 5,
  },
  friendText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default UserSearchModal; 