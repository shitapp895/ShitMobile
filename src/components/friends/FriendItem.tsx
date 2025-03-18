import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FriendData } from '../../types/friend';

interface FriendItemProps {
  friend: FriendData;
  onRemoveFriend: (friendId: string) => void;
}

const FriendItem: React.FC<FriendItemProps> = ({ friend, onRemoveFriend }) => {
  const { id, displayName, photoURL, isShitting } = friend;
  
  return (
    <View style={styles.friendItem}>
      <View style={styles.avatarContainer}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.statusIndicator, 
          isShitting ? styles.shittingStatus : styles.onlineStatus
        ]} />
      </View>
      
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{displayName}</Text>
        <Text style={styles.statusText}>
          {isShitting ? 'Shitting' : 'Online'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => onRemoveFriend(id)}
      >
        <Ionicons name="remove-circle" size={24} color="#8e8e93" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  friendItem: {
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
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
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
  statusIndicator: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
    right: 0,
    bottom: 0,
  },
  onlineStatus: {
    backgroundColor: '#34c759',
  },
  shittingStatus: {
    backgroundColor: '#ff9500',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  removeButton: {
    padding: 6,
  },
});

export default FriendItem; 