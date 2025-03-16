import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion,
  writeBatch,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  addDoc,
  deleteDoc,
  orderBy,
  Timestamp,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { ref, onValue, get } from 'firebase/database';
import { firestore, database } from '../../firebase/config';
import { createGame } from './gameService';

// Types
export interface GameInvite {
  id?: string;
  senderId: string;
  receiverId: string;
  gameType: 'tictactoe';
  status: 'pending' | 'accepted' | 'declined';
  timestamp: Timestamp;
  gameId?: string;
}

// Collection reference
const gameInvitesCollection = collection(firestore, 'gameInvites');

// Convert Firebase document to GameInvite
const convertGameInviteDoc = (doc: QueryDocumentSnapshot<DocumentData>): GameInvite => {
  const data = doc.data();
  return {
    id: doc.id,
    senderId: data.senderId,
    receiverId: data.receiverId,
    gameType: data.gameType,
    status: data.status,
    timestamp: data.timestamp,
    gameId: data.gameId,
  };
};

// Send a game invite
export const sendGameInvite = async (senderId: string, receiverId: string, gameType: 'tictactoe'): Promise<string> => {
  try {
    console.log('Attempting to send game invite:', { senderId, receiverId, gameType });
    
    // Check if sender has any pending invites
    const pendingInvites = await getPendingInvites(senderId);
    console.log('Current pending invites:', pendingInvites);
    
    if (pendingInvites.length > 0) {
      throw new Error('You can only send one game invite at a time');
    }

    // Check if both users are currently shitting
    const [senderStatus, receiverStatus] = await Promise.all([
      checkUserShittingStatus(senderId),
      checkUserShittingStatus(receiverId)
    ]);
    
    console.log('User statuses:', { senderStatus, receiverStatus });

    if (!senderStatus || !receiverStatus) {
      throw new Error('Both users must be currently shitting to send/receive game invites');
    }
    
    // Create a new game invite document
    const inviteRef = doc(collection(firestore, 'gameInvites'));
    const invite: GameInvite = {
      id: inviteRef.id,
      senderId,
      receiverId,
      gameType,
      status: 'pending',
      timestamp: Timestamp.now()
    };
    
    console.log('Creating game invite document:', invite);
    await setDoc(inviteRef, invite);
    console.log('Game invite created successfully');
    return inviteRef.id;
  } catch (error) {
    console.error('Error sending game invite:', error);
    throw error;
  }
};

// Accept a game invite
export const acceptGameInvite = async (inviteId: string): Promise<{ gameId: string, gameType: string }> => {
  try {
    const inviteRef = doc(firestore, 'gameInvites', inviteId);
    const inviteDoc = await getDoc(inviteRef);

    if (!inviteDoc.exists()) {
      throw new Error('Game invite not found');
    }

    const inviteData = inviteDoc.data() as GameInvite;
    const { senderId, receiverId, gameType } = inviteData;

    // Create a new game using the game service
    const gameData = {
      type: gameType,
      players: [senderId, receiverId],
      status: 'active' as const,
      currentTurn: senderId, // Sender goes first
      board: Array(9).fill(null),
      createdAt: Timestamp.now(),
      lastUpdated: Timestamp.now()
    };

    const gameId = await createGame(gameData);

    // Update the invite with the game ID before deleting it
    await updateDoc(inviteRef, {
      gameId,
      status: 'accepted'
    });

    // Delete the invite after a short delay to ensure the update is processed
    setTimeout(async () => {
      await deleteDoc(inviteRef);
    }, 1000);

    return {
      gameId,
      gameType
    };
  } catch (error) {
    console.error('Error accepting game invite:', error);
    throw error;
  }
};

// Decline a game invite
export const declineGameInvite = async (inviteId: string): Promise<void> => {
  try {
    const inviteRef = doc(firestore, 'gameInvites', inviteId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      throw new Error('Game invite not found');
    }
    
    // Delete the game invite document
    await deleteDoc(inviteRef);
  } catch (error) {
    console.error('Error declining game invite:', error);
    throw error;
  }
};

// Cancel a game invite
export const cancelGameInvite = async (inviteId: string): Promise<void> => {
  try {
    const inviteRef = doc(firestore, 'gameInvites', inviteId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      throw new Error('Game invite not found');
    }
    
    // Delete the game invite document
    await deleteDoc(inviteRef);
  } catch (error) {
    console.error('Error canceling game invite:', error);
    throw error;
  }
};

// Get received game invites
export const getReceivedGameInvites = async (userId: string): Promise<GameInvite[]> => {
  try {
    console.log('Fetching received game invites for user:', userId);
    const q = query(
      gameInvitesCollection,
      where('receiverId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    const invites = querySnapshot.docs.map(convertGameInviteDoc);
    console.log('Found received invites:', invites);
    return invites;
  } catch (error) {
    console.error('Error getting received game invites:', error);
    throw error;
  }
};

// Get sent game invites
export const getSentGameInvites = async (userId: string): Promise<GameInvite[]> => {
  try {
    const q = query(
      gameInvitesCollection,
      where('senderId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertGameInviteDoc);
  } catch (error) {
    console.error('Error getting sent game invites:', error);
    throw error;
  }
};

// Get pending invites (both sent and received)
export const getPendingInvites = async (userId: string): Promise<GameInvite[]> => {
  try {
    const q = query(
      gameInvitesCollection,
      where('status', '==', 'pending'),
      where('senderId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertGameInviteDoc);
  } catch (error) {
    console.error('Error getting pending invites:', error);
    throw error;
  }
};

// Check if a user is currently shitting
const checkUserShittingStatus = async (userId: string): Promise<boolean> => {
  try {
    const statusRef = ref(database, `status/${userId}`);
    const snapshot = await get(statusRef);
    return snapshot.exists() && snapshot.val().isShitting === true;
  } catch (error) {
    console.error('Error checking user shitting status:', error);
    return false;
  }
};

// Subscribe to game invites for real-time updates
export const subscribeToGameInvites = (
  userId: string,
  onInvitesUpdate: (invites: GameInvite[]) => void
): () => void => {
  console.log('Setting up game invite subscription for user:', userId);
  const q = query(
    gameInvitesCollection,
    where('receiverId', '==', userId),
    where('status', '==', 'pending')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const invites = snapshot.docs.map(convertGameInviteDoc);
    console.log('Received game invite update:', invites);
    onInvitesUpdate(invites);
  });

  return unsubscribe;
};

// Subscribe to sent game invites for real-time updates
export const subscribeToSentGameInvites = (
  userId: string,
  onInvitesUpdate: (invites: GameInvite[]) => void
): () => void => {
  console.log('Setting up sent game invite subscription for user:', userId);
  const q = query(
    gameInvitesCollection,
    where('senderId', '==', userId),
    where('status', 'in', ['pending', 'accepted'])
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const invites = snapshot.docs.map(convertGameInviteDoc);
    console.log('Received sent game invite update:', invites);
    onInvitesUpdate(invites);
  });

  return unsubscribe;
}; 