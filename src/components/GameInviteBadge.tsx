import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, PanResponder, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGameInvites } from '../hooks/useGameInvites';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { GameInvite } from '../services/database/gameInviteService';

type RootStackParamList = {
  Game: { gameId: string; gameType: string };
  Wordle: { gameId: string; isHost: boolean; opponentId: string; opponentName: string };
  WordChain: { gameId: string; isHost: boolean; opponentId: string; opponentName: string };
  WordSearch: { gameId: string; isHost: boolean; opponentId: string; opponentName: string };
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
  const { receivedInvites, acceptInvite, declineInvite, handleDismissInvite } = useGameInvites();
  const navigation = useNavigation<NavigationProp>();
  const { userData } = useAuth();
  const [invitesWithNames, setInvitesWithNames] = useState<InviteWithSenderName[]>([]);
  const [dismissedInvites, setDismissedInvites] = useState<Set<string>>(new Set());
  const [currentInviteId, setCurrentInviteId] = useState<string | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  // Create pan responder for swipe gestures
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      // Only allow upward swipes
      if (gestureState.dy < 0) {
        pan.setValue({ x: 0, y: gestureState.dy });
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      // If swiped up more than 50 units, dismiss the notification
      if (gestureState.dy < -50 && currentInviteId) {
        // First dismiss the invite
        handleDismissInvite(currentInviteId);
        // Then animate it off screen
        Animated.timing(pan, {
          toValue: { x: 0, y: -200 },
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Reset position after animation
          pan.setValue({ x: 0, y: 0 });
        });
      } else {
        // Return to original position if not swiped far enough
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      }
    },
  });

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

  // Auto-dismiss timer effect
  useEffect(() => {
    // Clear any existing timer
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    // Set up new timer for each non-dismissed invite
    invitesWithNames.forEach(invite => {
      if (!dismissedInvites.has(invite.id!)) {
        dismissTimerRef.current = setTimeout(() => {
          handleDismissInvite(invite.id!);
          setDismissedInvites(prev => new Set([...prev, invite.id!]));
        }, 5000); // 5 seconds
      }
    });

    // Cleanup timer on unmount or when invites change
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [invitesWithNames, dismissedInvites]);

  // Update dismissed invites when received invites change
  useEffect(() => {
    // If an invite is no longer in receivedInvites, it means it was declined or accepted
    // So we should add it to dismissedInvites
    const currentInviteIds = new Set(receivedInvites.map(invite => invite.id));
    setDismissedInvites(prev => {
      const newDismissed = new Set(prev);
      // Add any invites that are no longer in receivedInvites
      invitesWithNames.forEach(invite => {
        if (!currentInviteIds.has(invite.id)) {
          newDismissed.add(invite.id!);
        }
      });
      return newDismissed;
    });
  }, [receivedInvites, invitesWithNames]);

  console.log('GameInviteBadge - Current received invites:', invitesWithNames);

  const handleAcceptInvite = async (invite: InviteWithSenderName) => {
    try {
      if (!invite.id) {
        throw new Error('Invalid invite ID');
      }
      
      const { gameId, gameType } = await acceptInvite(invite.id);
      // Navigate to the game screen with the correct game ID
      navigation.navigate('Game', {
        gameId,
        gameType
      });
    } catch (error) {
      console.error('Error accepting invite:', error);
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
    <View style={[styles.container, { marginTop: insets.top }]}>
      {invitesWithNames.map((invite) => {
        if (dismissedInvites.has(invite.id!)) return null;

        const cardStyle = {
          transform: [
            { translateY: pan.y },
            {
              scale: pan.y.interpolate({
                inputRange: [-200, 0],
                outputRange: [0.8, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        };

        return (
          <Animated.View 
            key={invite.id} 
            style={[styles.inviteCard, cardStyle]}
            {...panResponder.panHandlers}
            onStartShouldSetResponder={() => {
              setCurrentInviteId(invite.id!);
              return true;
            }}
          >
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
                onPress={() => handleAcceptInvite(invite)}
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
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  inviteCard: {
    backgroundColor: '#1e293b',
    margin: 10,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    color: '#fff',
  },
  inviteSubtext: {
    fontSize: 14,
    color: '#94a3b8',
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