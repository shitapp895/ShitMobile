import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGameInvites } from '../hooks/useGameInvites';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { GameInvite } from '../services/database/gameInviteService';

type RootStackParamList = {
  Game: { gameId: string; gameType: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface InviteWithSenderName extends GameInvite {
  senderName?: string;
}

const getGameDisplayName = (gameType: string): string => {
  const gameNames: { [key: string]: string } = {
    'tictactoe': 'Tic Tac Toe',
    'rps': 'Rock Paper Scissors',
    'wordle': 'Toilet Wordle',
    'hangman': 'Hangman'
  };
  return gameNames[gameType] || gameType;
};

export const GameInviteBadge: React.FC = () => {
  const { receivedInvites, acceptInvite, declineInvite } = useGameInvites();
  const navigation = useNavigation<NavigationProp>();
  const { userData } = useAuth();
  const [invitesWithNames, setInvitesWithNames] = useState<InviteWithSenderName[]>([]);

  useEffect(() => {
    const fetchSenderNames = async () => {
      if (!receivedInvites.length) return;

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

  console.log('GameInviteBadge - Current received invites:', invitesWithNames);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      console.log('Accepting game invite:', inviteId);
      const { gameId, gameType } = await acceptInvite(inviteId);
      console.log('Game invite accepted, navigating to game:', { gameId, gameType });
      // Navigate to the game screen
      navigation.navigate('Game', { gameId, gameType });
    } catch (error) {
      console.error('Error accepting game invite:', error);
      Alert.alert('Error', 'Failed to accept game invite. Please try again.');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      console.log('Declining game invite:', inviteId);
      await declineInvite(inviteId);
    } catch (error) {
      console.error('Error declining game invite:', error);
      Alert.alert('Error', 'Failed to decline game invite. Please try again.');
    }
  };

  if (invitesWithNames.length === 0) {
    console.log('No received invites to display');
    return null;
  }

  return (
    <View style={styles.container}>
      {invitesWithNames.map((invite) => (
        <View key={invite.id} style={styles.inviteCard}>
          <View style={styles.inviteContent}>
            <Ionicons name="game-controller" size={24} color="#6366f1" />
            <View style={styles.inviteTextContainer}>
              <Text style={styles.inviteText}>
                Game Invite: {getGameDisplayName(invite.gameType)}
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
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: 10,
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
  inviteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 