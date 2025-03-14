import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { firestore } from '../../firebase/config';

// Types
export interface Shweet {
  id?: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  timestamp: Timestamp | Date;
  isFromToilet: boolean;
  likes: string[]; // Array of user IDs who liked this Shweet
  comments: number; // Count of comments
}

export interface ShweetComment {
  id?: string;
  shweetId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  timestamp: Timestamp | Date;
  isFromToilet: boolean;
}

// Collection references
const shweetsCollection = collection(firestore, 'shweets');
const getCommentsCollection = (shweetId: string) => 
  collection(firestore, 'shweets', shweetId, 'comments');

// Convert Firebase document to Shweet
const convertShweetDoc = (doc: QueryDocumentSnapshot<DocumentData>): Shweet => {
  const data = doc.data();
  return {
    id: doc.id,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL,
    content: data.content,
    timestamp: data.timestamp,
    isFromToilet: data.isFromToilet,
    likes: data.likes || [],
    comments: data.comments || 0,
  };
};

// Convert Firebase document to ShweetComment
const convertCommentDoc = (doc: QueryDocumentSnapshot<DocumentData>): ShweetComment => {
  const data = doc.data();
  return {
    id: doc.id,
    shweetId: data.shweetId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL,
    content: data.content,
    timestamp: data.timestamp,
    isFromToilet: data.isFromToilet,
  };
};

// Shweets CRUD operations
export const createShweet = async (shweet: Omit<Shweet, 'id'>): Promise<Shweet> => {
  try {
    const shweetWithTimestamp = {
      ...shweet,
      timestamp: Timestamp.now(),
      likes: [],
      comments: 0,
    };
    
    const docRef = await addDoc(shweetsCollection, shweetWithTimestamp);
    
    return {
      id: docRef.id,
      ...shweetWithTimestamp,
    };
  } catch (error) {
    console.error('Error creating shweet:', error);
    throw error;
  }
};

export const getShweet = async (id: string): Promise<Shweet | null> => {
  try {
    const docRef = doc(firestore, 'shweets', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Shweet;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting shweet:', error);
    throw error;
  }
};

export const getRecentShweets = async (limitCount = 20): Promise<Shweet[]> => {
  try {
    const q = query(
      shweetsCollection,
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(convertShweetDoc);
  } catch (error) {
    console.error('Error getting recent shweets:', error);
    throw error;
  }
};

export const getUserShweets = async (userId: string): Promise<Shweet[]> => {
  try {
    const q = query(
      shweetsCollection,
      where('authorId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(convertShweetDoc);
  } catch (error) {
    console.error('Error getting user shweets:', error);
    throw error;
  }
};

export const getFriendsShweets = async (friendIds: string[]): Promise<Shweet[]> => {
  if (!friendIds.length) return [];
  
  try {
    const q = query(
      shweetsCollection,
      where('authorId', 'in', friendIds),
      orderBy('timestamp', 'desc'),
      firestoreLimit(50)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(convertShweetDoc);
  } catch (error) {
    console.error('Error getting friends shweets:', error);
    throw error;
  }
};

export const likeShweet = async (shweetId: string, userId: string): Promise<void> => {
  try {
    const shweetRef = doc(firestore, 'shweets', shweetId);
    const shweetDoc = await getDoc(shweetRef);
    
    if (shweetDoc.exists()) {
      const shweetData = shweetDoc.data();
      const likes = shweetData.likes || [];
      
      // Check if user already liked
      if (!likes.includes(userId)) {
        await updateDoc(shweetRef, {
          likes: [...likes, userId],
        });
      }
    }
  } catch (error) {
    console.error('Error liking shweet:', error);
    throw error;
  }
};

export const unlikeShweet = async (shweetId: string, userId: string): Promise<void> => {
  try {
    const shweetRef = doc(firestore, 'shweets', shweetId);
    const shweetDoc = await getDoc(shweetRef);
    
    if (shweetDoc.exists()) {
      const shweetData = shweetDoc.data();
      const likes = shweetData.likes || [];
      
      // Remove user from likes
      await updateDoc(shweetRef, {
        likes: likes.filter((id: string) => id !== userId),
      });
    }
  } catch (error) {
    console.error('Error unliking shweet:', error);
    throw error;
  }
};

export const deleteShweet = async (shweetId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, 'shweets', shweetId));
  } catch (error) {
    console.error('Error deleting shweet:', error);
    throw error;
  }
};

// Comments CRUD operations
export const addComment = async (comment: Omit<ShweetComment, 'id'>): Promise<ShweetComment> => {
  try {
    const commentWithTimestamp = {
      ...comment,
      timestamp: Timestamp.now(),
    };
    
    // Add the comment
    const commentsCollection = getCommentsCollection(comment.shweetId);
    const docRef = await addDoc(commentsCollection, commentWithTimestamp);
    
    // Increment the comment count on the shweet
    const shweetRef = doc(firestore, 'shweets', comment.shweetId);
    const shweetDoc = await getDoc(shweetRef);
    
    if (shweetDoc.exists()) {
      const shweetData = shweetDoc.data();
      const currentComments = shweetData.comments || 0;
      
      await updateDoc(shweetRef, {
        comments: currentComments + 1,
      });
    }
    
    return {
      id: docRef.id,
      ...commentWithTimestamp,
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getShweetComments = async (shweetId: string): Promise<ShweetComment[]> => {
  try {
    const commentsCollection = getCommentsCollection(shweetId);
    const q = query(commentsCollection, orderBy('timestamp', 'asc'));
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(convertCommentDoc);
  } catch (error) {
    console.error('Error getting shweet comments:', error);
    throw error;
  }
}; 