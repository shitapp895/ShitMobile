import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import * as gameInviteService from '../services/database/gameInviteService';
import { GameInvite } from '../services/database/gameInviteService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface UseGameInvitesResult {
  receivedInvites: GameInvite[];
  sentInvites: GameInvite[];
  loading: boolean;
  error: Error | null;
  sendInvite: (receiverId: string, gameType: 'tictactoe') => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<{ gameId: string; gameType: string }>;
  declineInvite: (inviteId: string) => Promise<void>;
  refreshInvites: () => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  handleDismissInvite: (inviteId: string) => void;
}

export const useGameInvites = (): UseGameInvitesResult => {
  const { userData } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [receivedInvites, setReceivedInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [unsubscribeReceived, setUnsubscribeReceived] = useState<(() => void) | null>(null);
  const [unsubscribeSent, setUnsubscribeSent] = useState<(() => void) | null>(null);

  // Fetch all invites
  const fetchInvites = useCallback(async () => {
    if (!userData?.uid) {
      console.log('No user ID available, skipping fetch');
      return;
    }

    try {
      console.log('Fetching invites for user:', userData.uid);
      setLoading(true);
      setError(null);

      const [received, sent] = await Promise.all([
        gameInviteService.getReceivedGameInvites(userData.uid),
        gameInviteService.getSentGameInvites(userData.uid)
      ]);

      console.log('Fetched invites:', { received, sent });
      setReceivedInvites(received);
      setSentInvites(sent);
    } catch (err) {
      console.error('Error fetching invites:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userData?.uid]);

  // Set up real-time subscriptions for both received and sent invites
  useEffect(() => {
    if (!userData?.uid) {
      console.log('No user ID available, skipping subscriptions');
      return;
    }

    console.log('Setting up real-time subscriptions for user:', userData.uid);
    
    // Subscribe to received invites
    const unsubscribeReceivedFn = gameInviteService.subscribeToGameInvites(
      userData.uid,
      (invites) => {
        console.log('Received real-time update for received invites:', invites);
        setReceivedInvites(invites);
      }
    );

    // Subscribe to sent invites
    const unsubscribeSentFn = gameInviteService.subscribeToSentGameInvites(
      userData.uid,
      (invites) => {
        console.log('Received real-time update for sent invites:', invites);
        setSentInvites(invites);
      }
    );

    setUnsubscribeReceived(() => unsubscribeReceivedFn);
    setUnsubscribeSent(() => unsubscribeSentFn);

    return () => {
      if (unsubscribeReceived) {
        console.log('Cleaning up received invites subscription');
        unsubscribeReceived();
      }
      if (unsubscribeSent) {
        console.log('Cleaning up sent invites subscription');
        unsubscribeSent();
      }
    };
  }, [userData?.uid]);

  // Initial load
  useEffect(() => {
    console.log('Initial load of invites');
    fetchInvites();
  }, [fetchInvites]);

  // Send a game invite
  const sendInvite = async (receiverId: string, gameType: 'tictactoe'): Promise<void> => {
    if (!userData?.uid) {
      console.error('Cannot send invite: User not authenticated');
      throw new Error('User not authenticated');
    }

    try {
      console.log('Sending invite:', { senderId: userData.uid, receiverId, gameType });
      setError(null);
      await gameInviteService.sendGameInvite(userData.uid, receiverId, gameType);
      console.log('Invite sent successfully');
      await fetchInvites();
    } catch (err) {
      console.error('Error sending invite:', err);
      setError(err as Error);
      throw err;
    }
  };

  // Accept a game invite
  const acceptInvite = async (inviteId: string): Promise<{ gameId: string; gameType: string }> => {
    if (!userData?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      const result = await gameInviteService.acceptGameInvite(inviteId);
      // Navigate to the game screen for the accepting user
      navigation.navigate('Game', {
        gameId: result.gameId,
        gameType: result.gameType
      });
      await fetchInvites();
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Watch for changes in sent invites to detect when an invite is accepted
  useEffect(() => {
    if (!userData?.uid) return;

    // Check if any sent invites were just accepted
    sentInvites.forEach(invite => {
      if (invite.status === 'accepted' && invite.gameId) {
        // This invite was just accepted, navigate to the game
        navigation.navigate('Game', {
          gameId: invite.gameId,
          gameType: invite.gameType
        });
      }
    });
  }, [sentInvites, userData?.uid]);

  // Decline a game invite
  const declineInvite = async (inviteId: string): Promise<void> => {
    if (!userData?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      await gameInviteService.declineGameInvite(inviteId);
      await fetchInvites();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const cancelInvite = async (inviteId: string) => {
    if (!userData?.uid) return;
    await gameInviteService.cancelGameInvite(inviteId);
  };

  const handleDismissInvite = (inviteId: string) => {
    setReceivedInvites(prev => prev.filter(invite => invite.id !== inviteId));
  };

  return {
    receivedInvites,
    sentInvites,
    loading,
    error,
    sendInvite,
    acceptInvite,
    declineInvite,
    refreshInvites: fetchInvites,
    cancelInvite,
    handleDismissInvite
  };
}; 