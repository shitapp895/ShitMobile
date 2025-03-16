import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useGameInvites } from '../hooks/useGameInvites';
import { GameInviteBadge } from '../components/GameInviteBadge';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, onValue, get } from 'firebase/database';
import { firestore, database } from '../firebase/config';
import { FriendData } from '../types/friend';
import { getFriends } from '../services/database/friendService';

interface GameCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export default function GamesScreen() {
  const { userData } = useAuth();
  const { sendInvite, sentInvites, receivedInvites, acceptInvite, declineInvite, cancelInvite } = useGameInvites();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameCard | null>(null);
  const [invitesWithNames, setInvitesWithNames] = useState<Array<{ id?: string; gameType: string; senderId: string; senderName: string }>>([]);
  const [sentInvitesWithNames, setSentInvitesWithNames] = useState<Array<{ id?: string; gameType: string; receiverId: string; receiverName: string }>>([]);
  
  // Sample game data
  const games: GameCard[] = [
    {
      id: 'tictactoe',
      title: 'Tic Tac Toe',
      description: 'Classic game with custom markers (💩 vs 🧻)',
      icon: 'grid',
      color: '#10b981',
    },
    {
      id: 'rps',
      title: 'Rock Paper Scissors',
      description: 'Themed choices: Poop, Toilet Paper, Plunger',
      icon: 'hand-right',
      color: '#6366f1',
    },
    {
      id: 'wordle',
      title: 'Toilet Wordle',
      description: 'Guess the bathroom-themed word in 6 tries',
      icon: 'text',
      color: '#f59e0b',
    },
    {
      id: 'hangman',
      title: 'Hangman',
      description: 'Guess the word before the toilet flushes',
      icon: 'man',
      color: '#ef4444',
    },
  ];

  const getGameDisplayName = (gameType: string): string => {
    const game = games.find(g => g.id === gameType);
    return game ? game.title : gameType;
  };

  // Fetch friends who are currently shitting
  useEffect(() => {
    const fetchShittingFriends = async () => {
      if (!userData?.uid || !userData.friends?.length) {
        setFriends([]);
        setLoading(false);
        return;
      }

      try {
        const friendsData: FriendData[] = [];
        
        for (const friendId of userData.friends) {
          // Get friend's user data
          const friendDoc = await getDoc(doc(firestore, 'users', friendId));
          if (!friendDoc.exists()) continue;

          const friendUserData = friendDoc.data();
          
          // Get friend's status
          const statusRef = ref(database, `status/${friendId}`);
          const statusSnapshot = await get(statusRef);
          const status = statusSnapshot.val() || {};
          
          if (status.isShitting) {
            friendsData.push({
              id: friendId,
              displayName: friendUserData.displayName || 'Unknown User',
              photoURL: friendUserData.photoURL,
              isShitting: true
            });
          }
        }
        
        setFriends(friendsData);
      } catch (error) {
        console.error('Error fetching shitting friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShittingFriends();

    // Set up real-time listeners for friend status
    const statusListeners = userData?.friends?.map(friendId => {
      const statusRef = ref(database, `status/${friendId}`);
      return onValue(statusRef, (snapshot) => {
        const status = snapshot.val() || {};
        setFriends(prevFriends => {
          if (status.isShitting) {
            // Add friend if not already in the list
            if (!prevFriends.find(f => f.id === friendId)) {
              return [...prevFriends, {
                id: friendId,
                displayName: prevFriends.find(f => f.id === friendId)?.displayName || 'Unknown User',
                photoURL: prevFriends.find(f => f.id === friendId)?.photoURL || null,
                isShitting: true
              }];
            }
          } else {
            // Remove friend if they're no longer shitting
            return prevFriends.filter(f => f.id !== friendId);
          }
          return prevFriends;
        });
      });
    });

    return () => {
      statusListeners?.forEach(unsubscribe => unsubscribe());
    };
  }, [userData?.uid, userData?.friends]);

  // Fetch sender names for received invites
  useEffect(() => {
    const fetchSenderNames = async () => {
      if (!receivedInvites.length) {
        setInvitesWithNames([]);
        return;
      }

      const invitesWithSenderNames = await Promise.all(
        receivedInvites.map(async (invite) => {
          try {
            const senderDoc = await getDoc(doc(firestore, 'users', invite.senderId));
            const senderData = senderDoc.data();
            return {
              ...invite,
              senderName: senderData?.displayName || 'Unknown User'
            };
          } catch (error) {
            console.error('Error fetching sender name:', error);
            return {
              ...invite,
              senderName: 'Unknown User'
            };
          }
        })
      );

      setInvitesWithNames(invitesWithSenderNames);
    };

    fetchSenderNames();
  }, [receivedInvites]);

  // Fetch recipient names for sent invites
  useEffect(() => {
    const fetchRecipientNames = async () => {
      if (!sentInvites.length) {
        setSentInvitesWithNames([]);
        return;
      }

      const invitesWithRecipientNames = await Promise.all(
        sentInvites.map(async (invite) => {
          try {
            const recipientDoc = await getDoc(doc(firestore, 'users', invite.receiverId));
            const recipientData = recipientDoc.data();
            return {
              ...invite,
              receiverName: recipientData?.displayName || 'Unknown User'
            };
          } catch (error) {
            console.error('Error fetching recipient name:', error);
            return {
              ...invite,
              receiverName: 'Unknown User'
            };
          }
        })
      );

      setSentInvitesWithNames(invitesWithRecipientNames);
    };

    fetchRecipientNames();
  }, [sentInvites]);

  // Handle sending game invite
  const handleSendInvite = async (friendId: string) => {
    if (!selectedGame) return;

    try {
      console.log('Sending game invite to friend:', friendId, 'for game:', selectedGame.id);
      await sendInvite(friendId, selectedGame.id as 'tictactoe');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error sending game invite:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send game invite. Please try again.');
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptInvite(inviteId);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept game invite. Please try again.');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await declineInvite(inviteId);
    } catch (error) {
      Alert.alert('Error', 'Failed to decline game invite. Please try again.');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite(inviteId);
      Alert.alert('Success', 'Game invite cancelled');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel game invite. Please try again.');
    }
  };

  // Render a game card
  const renderGameCard = (game: GameCard) => (
    <TouchableOpacity 
      key={game.id}
      style={styles.gameCard}
      onPress={() => {
        setSelectedGame(game);
        setShowInviteModal(true);
      }}
    >
      <View style={[styles.gameIconContainer, { backgroundColor: game.color }]}>
        <Ionicons name={game.icon as any} size={32} color="#fff" />
      </View>
      
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle}>{game.title}</Text>
        <Text style={styles.gameDescription}>{game.description}</Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  // Render a friend item in the invite modal
  const renderFriendItem = (friend: FriendData) => (
    <TouchableOpacity
      key={friend.id}
      style={styles.friendItem}
      onPress={() => handleSendInvite(friend.id)}
    >
      {friend.photoURL ? (
        <Image source={{ uri: friend.photoURL }} style={styles.friendAvatar} />
      ) : (
        <View style={styles.defaultAvatar}>
          <Text style={styles.avatarText}>{friend.displayName.charAt(0)}</Text>
        </View>
      )}
      
      <Text style={styles.friendName}>{friend.displayName}</Text>
      
      <View style={styles.shittingBadge}>
        <Ionicons name="water" size={12} color="#fff" />
        <Text style={styles.shittingText}>Shitting</Text>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Games</Text>
          <Text style={styles.subtitle}>Play while you poop</Text>
        </View>
        
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Games Played</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        {/* Game Invites Section */}
        {(receivedInvites.length > 0 || sentInvites.length > 0) && (
          <View style={styles.invitesSection}>
            <Text style={styles.sectionTitle}>Game Invites</Text>
            
            {receivedInvites.length > 0 && (
              <View style={styles.inviteSubsection}>
                <Text style={styles.subsectionTitle}>Received</Text>
                {invitesWithNames.map((invite) => (
                  <View key={invite.id} style={styles.inviteCard}>
                    <View style={styles.inviteContent}>
                      <Ionicons name="game-controller" size={24} color="#6366f1" />
                      <View style={styles.inviteTextContainer}>
                        <Text style={styles.inviteText}>
                          {getGameDisplayName(invite.gameType)}
                        </Text>
                        <Text style={styles.inviteSubtext}>
                          From: {invite.senderName}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.inviteActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => handleAcceptInvite(invite.id!)}
                      >
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.declineButton]}
                        onPress={() => handleDeclineInvite(invite.id!)}
                      >
                        <Text style={styles.actionButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {sentInvites.length > 0 && (
              <View style={styles.inviteSubsection}>
                <Text style={styles.subsectionTitle}>Sent</Text>
                {sentInvitesWithNames.map((invite) => (
                  <View key={invite.id} style={styles.inviteCard}>
                    <View style={styles.inviteCardContent}>
                      <View style={styles.inviteContent}>
                        <Ionicons name="game-controller" size={24} color="#6366f1" />
                        <View style={styles.inviteTextContainer}>
                          <Text style={styles.inviteText}>
                            {getGameDisplayName(invite.gameType)}
                          </Text>
                          <Text style={styles.inviteSubtext}>
                            To: {invite.receiverName}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => handleCancelInvite(invite.id!)}
                      >
                        <Text style={styles.actionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        
        <View style={styles.gamesSection}>
          <Text style={styles.sectionTitle}>Available Games</Text>
          {games.map(renderGameCard)}
        </View>
      </ScrollView>

      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Friends to {selectedGame?.title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowInviteModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : friends.length > 0 ? (
              <ScrollView style={styles.friendsList}>
                {friends.map(renderFriendItem)}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No friends currently shitting</Text>
                <Text style={styles.emptySubtext}>Invite them to play when they're on the toilet!</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e5e7eb',
  },
  gamesSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f2937',
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  gameDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  friendsList: {
    maxHeight: 400,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 10,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  shittingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shittingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 5,
    textAlign: 'center',
  },
  invitesSection: {
    padding: 15,
  },
  inviteSubsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  inviteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviteTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  inviteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  inviteSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#6366f1',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 