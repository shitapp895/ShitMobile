import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/config';
import { FriendRequest } from '../../services/database/friendRequestService';

interface FriendRequestItemProps {
  item: FriendRequest;
  isReceived: boolean;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const FriendRequestItem: React.FC<FriendRequestItemProps> = ({ 
  item, 
  isReceived, 
  onAccept, 
  onDecline, 
  onCancel 
}) => {
  const [otherUserData, setOtherUserData] = useState<{
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);
  
  const otherUserId = isReceived ? item.senderId : item.receiverId;
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (!otherUserId) return;
      
      try {
        const userRef = doc(firestore, 'users', otherUserId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setOtherUserData({
            displayName: userData.displayName || null,
            photoURL: userData.photoURL || null
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, [otherUserId]);
  
  return (
    <View style={styles.requestItem}>
      <View style={styles.friendAvatar}>
        {otherUserData?.photoURL ? (
          <Image source={{ uri: otherUserData.photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>
              {otherUserData?.displayName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>
          {otherUserData?.displayName || 'Loading...'}
        </Text>
        <Text style={styles.requestStatus}>
          {isReceived ? 'Sent you a friend request' : 'Friend request sent'}
        </Text>
      </View>
      
      {isReceived ? (
        <View style={styles.requestActions}>
          <TouchableOpacity 
            style={[styles.requestButton, styles.acceptButton]}
            onPress={() => onAccept && onAccept(item.id!)}
          >
            <Text style={styles.requestButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.requestButton, styles.declineButton]}
            onPress={() => onDecline && onDecline(item.id!)}
          >
            <Text style={styles.requestButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.requestButton, styles.cancelButton]}
          onPress={() => onCancel && onCancel(item.id!)}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="close-circle" size={16} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.requestButtonText}>Cancel</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  requestItem: {
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
  friendAvatar: {
    position: 'relative',
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
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  requestStatus: {
    fontSize: 16,
    color: '#8e8e93',
  },
  requestActions: {
    flexDirection: 'row',
  },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: '#34c759',
  },
  declineButton: {
    backgroundColor: '#ff3b30',
  },
  cancelButton: {
    backgroundColor: '#8e8e93',
  },
});

export default FriendRequestItem; 