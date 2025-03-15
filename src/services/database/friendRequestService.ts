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
  setDoc
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
export const sendFriendRequest = async (senderId: string, receiverId: string): Promise<string> => {
  try {
    // Check if a request already exists
    const existingRequest = await checkPendingRequest(senderId, receiverId);
    if (existingRequest) {
      throw new Error('A friend request already exists between these users');
    }
    
    // Create a new friend request document
    const requestRef = doc(collection(firestore, 'friendRequests'));
    const request: FriendRequest = {
      id: requestRef.id,
      senderId,
      receiverId,
      status: 'pending',
      timestamp: Timestamp.now()
    };
    
    await setDoc(requestRef, request);
    return requestRef.id;
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

// Check if a pending request exists between two users
export const checkPendingRequest = async (userId1: string, userId2: string): Promise<FriendRequest | null> => {
  try {
    // Check both directions (user1 -> user2 and user2 -> user1)
    const q = query(
      collection(firestore, 'friendRequests'),
      where('senderId', 'in', [userId1, userId2]),
      where('receiverId', 'in', [userId1, userId2]),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Get the first matching request
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id, // Make sure we include the document ID
      ...doc.data()
    } as FriendRequest;
  } catch (error) {
    console.error('Error checking pending request:', error);
    throw error;
  }
}; 