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
  Timestamp
} from 'firebase/firestore';
import { ref, update } from 'firebase/database';
import { firestore, database } from '../../firebase/config';

// Types
export interface FriendRequest {
  id?: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: Timestamp;
}

// Collection reference
const friendRequestsCollection = collection(firestore, 'friendRequests');

// Convert Firebase document to FriendRequest
const convertFriendRequestDoc = (doc: QueryDocumentSnapshot<DocumentData>): FriendRequest => {
  const data = doc.data();
  return {
    id: doc.id,
    senderId: data.senderId,
    receiverId: data.receiverId,
    status: data.status,
    timestamp: data.timestamp,
  };
};

// Send a friend request
export const sendFriendRequest = async (senderId: string, receiverId: string): Promise<void> => {
  try {
    // Check if a request already exists
    const existingRequestQuery = query(
      friendRequestsCollection,
      where('senderId', 'in', [senderId, receiverId]),
      where('receiverId', 'in', [senderId, receiverId]),
      where('status', '==', 'pending')
    );
    
    const existingRequests = await getDocs(existingRequestQuery);
    
    if (!existingRequests.empty) {
      throw new Error('A friend request already exists between these users');
    }
    
    // Create new friend request
    await addDoc(friendRequestsCollection, {
      senderId,
      receiverId,
      status: 'pending',
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

// Accept a friend request
export const acceptFriendRequest = async (requestId: string): Promise<void> => {
  try {
    const requestRef = doc(firestore, 'friendRequests', requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      // Instead of throwing an error, return a special status
      return Promise.reject({ status: 'cancelled' });
    }

    const requestData = requestDoc.data() as FriendRequest;
    const { senderId, receiverId } = requestData;

    // Add each user to the other's friends list
    const batch = writeBatch(firestore);
    
    // Add receiver to sender's friends
    const senderRef = doc(firestore, 'users', senderId);
    batch.update(senderRef, {
      friends: arrayUnion(receiverId)
    });
    
    // Add sender to receiver's friends
    const receiverRef = doc(firestore, 'users', receiverId);
    batch.update(receiverRef, {
      friends: arrayUnion(senderId)
    });
    
    // Delete the friend request
    batch.delete(requestRef);
    
    await batch.commit();
  } catch (error: any) {
    // If the error is already our special status, rethrow it
    if (error.status === 'cancelled') {
      throw error;
    }
    console.error('Error accepting friend request:', error);
    throw new Error('Failed to accept friend request');
  }
};

// Decline a friend request
export const declineFriendRequest = async (requestId: string): Promise<void> => {
  try {
    const requestRef = doc(firestore, 'friendRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }
    
    // Delete the friend request document
    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error declining friend request:', error);
    throw error;
  }
};

// Cancel a sent friend request
export const cancelFriendRequest = async (requestId: string, currentUserId: string): Promise<void> => {
  try {
    const requestRef = doc(firestore, 'friendRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }
    
    const request = requestDoc.data() as FriendRequest;
    
    // Verify that the current user is the sender of the request
    if (request.senderId !== currentUserId) {
      throw new Error('You can only cancel friend requests that you sent');
    }
    
    // Verify that the request is still pending
    if (request.status !== 'pending') {
      throw new Error('Friend request is no longer pending');
    }
    
    // Delete the friend request document
    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error canceling friend request:', error);
    throw error;
  }
};

// Get received friend requests
export const getReceivedFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    const q = query(
      friendRequestsCollection,
      where('receiverId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertFriendRequestDoc);
  } catch (error) {
    console.error('Error getting received friend requests:', error);
    throw error;
  }
};

// Get sent friend requests
export const getSentFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    const q = query(
      friendRequestsCollection,
      where('senderId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(convertFriendRequestDoc);
  } catch (error) {
    console.error('Error getting sent friend requests:', error);
    throw error;
  }
};

// Check if there's a pending request between two users
export const checkPendingRequest = async (userId1: string, userId2: string): Promise<FriendRequest | null> => {
  try {
    // Instead of using 'in' operator, we'll check both possible combinations
    // This is more efficient as it uses exact matches
    const q1 = query(
      friendRequestsCollection,
      where('senderId', '==', userId1),
      where('receiverId', '==', userId2),
      where('status', '==', 'pending')
    );
    
    const q2 = query(
      friendRequestsCollection,
      where('senderId', '==', userId2),
      where('receiverId', '==', userId1),
      where('status', '==', 'pending')
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);
    
    if (!snapshot1.empty) {
      return convertFriendRequestDoc(snapshot1.docs[0]);
    }
    
    if (!snapshot2.empty) {
      return convertFriendRequestDoc(snapshot2.docs[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error checking pending request:', error);
    throw error;
  }
}; 