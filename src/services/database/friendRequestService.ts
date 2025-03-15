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
      throw new Error('Friend request not found');
    }
    
    const request = requestDoc.data() as FriendRequest;
    
    // Update both users' friends lists and request status in a single batch
    const batch = writeBatch(firestore);
    
    // Add to receiver's friends list
    const receiverRef = doc(firestore, 'users', request.receiverId);
    batch.update(receiverRef, {
      friends: arrayUnion(request.senderId)
    });
    
    // Add to sender's friends list
    const senderRef = doc(firestore, 'users', request.senderId);
    batch.update(senderRef, {
      friends: arrayUnion(request.receiverId)
    });
    
    // Delete the friend request document
    batch.delete(requestRef);
    
    // Commit all updates in a single batch
    await batch.commit();
    
    // Only update the status of the user who is accepting the request
    const currentTime = Date.now();
    const statusUpdate = {
      state: 'online',
      lastChanged: currentTime,
    };
    
    // Update only the receiver's status (the user accepting the request)
    await update(ref(database, `status/${request.receiverId}`), statusUpdate);
    
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
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
export const cancelFriendRequest = async (requestId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, 'friendRequests', requestId));
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