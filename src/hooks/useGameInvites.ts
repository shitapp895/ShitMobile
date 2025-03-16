import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import * as gameInviteService from '../services/database/gameInviteService';
import { GameInvite } from '../services/database/gameInviteService';

export interface UseGameInvitesResult {
  receivedInvites: GameInvite[];
  sentInvites: GameInvite[];
  loading: boolean;
  error: Error | null;
  sendInvite: (receiverId: string, gameType: 'tictactoe') => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<{ gameId: string; gameType: string }>;
  declineInvite: (inviteId: string) => Promise<void>;
  refreshInvites: () => Promise<void>;
}

export const useGameInvites = (): UseGameInvitesResult => {
  const { userData } = useAuth();
  const [receivedInvites, setReceivedInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<GameInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

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

  // Set up real-time subscription for received invites
  useEffect(() => {
    if (!userData?.uid) {
      console.log('No user ID available, skipping subscription');
      return;
    }

    console.log('Setting up real-time subscription for user:', userData.uid);
    const unsubscribeFn = gameInviteService.subscribeToGameInvites(
      userData.uid,
      (invites) => {
        console.log('Received real-time update:', invites);
        setReceivedInvites(invites);
      }
    );

    setUnsubscribe(() => unsubscribeFn);

    return () => {
      if (unsubscribe) {
        console.log('Cleaning up subscription');
        unsubscribe();
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
      await fetchInvites();
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

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

  return {
    receivedInvites,
    sentInvites,
    loading,
    error,
    sendInvite,
    acceptInvite,
    declineInvite,
    refreshInvites: fetchInvites,
  };
}; 