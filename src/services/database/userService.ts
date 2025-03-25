import { 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  collection, 
  query, 
  where, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { ref, get, set } from 'firebase/database';
import { firestore, database } from '../../firebase/config';
import { UserData } from '../auth/authService';

// Function to get a user's data from Firestore
export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

// Function to get a user's status from Realtime Database
export const getUserStatus = async (userId: string): Promise<any> => {
  try {
    const userStatusRef = ref(database, `status/${userId}`);
    const snapshot = await get(userStatusRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user status:', error);
    throw error;
  }
};

// Function to update user profile data
export const updateUserData = async (
  userId: string, 
  data: Partial<UserData>
): Promise<void> => {
  try {
    const userDocRef = doc(firestore, 'users', userId);
    await updateDoc(userDocRef, data);
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

// Function to search for users
export const searchUsers = async (query: string): Promise<UserData[]> => {
  try {
    console.log('Starting user search with query:', query);
    // This is a simple implementation. In a real app, you'd use a more
    // sophisticated search mechanism like Algolia or Elasticsearch
    
    // Normalize the query
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      console.log('Empty query after normalization, returning empty results');
      return [];
    }
    
    console.log('Fetching all users from Firestore');
    const usersRef = collection(firestore, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users: UserData[] = [];
    
    console.log(`Processing ${querySnapshot.size} users for search results`);
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as UserData;
      
      // Simple case-insensitive search on displayName or email
      const displayName = userData.displayName?.toLowerCase() || '';
      const email = userData.email?.toLowerCase() || '';
      
      if (displayName.includes(normalizedQuery) || email.includes(normalizedQuery)) {
        users.push({
          ...userData,
          uid: doc.id,
        });
      }
    });
    
    console.log(`Found ${users.length} matching users`);
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// Function to add a friend
export const addFriend = async (userId: string, friendId: string): Promise<void> => {
  try {
    // Update current user's friends list
    const userDocRef = doc(firestore, 'users', userId);
    await updateDoc(userDocRef, {
      friends: arrayUnion(friendId),
    });
    
    // Update friend's friends list
    const friendDocRef = doc(firestore, 'users', friendId);
    await updateDoc(friendDocRef, {
      friends: arrayUnion(userId),
    });
  } catch (error) {
    console.error('Error adding friend:', error);
    throw error;
  }
};

// Function to remove a friend
export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
  try {
    // Update current user's friends list
    const userDocRef = doc(firestore, 'users', userId);
    await updateDoc(userDocRef, {
      friends: arrayRemove(friendId),
    });
    
    // Update friend's friends list
    const friendDocRef = doc(firestore, 'users', friendId);
    await updateDoc(friendDocRef, {
      friends: arrayRemove(userId),
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

// Function to get user's friends data
export const getUserFriends = async (userId: string): Promise<UserData[]> => {
  try {
    // Get the user document to retrieve friend IDs
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data() as UserData;
    const friendIds = userData.friends || [];
    
    if (friendIds.length === 0) {
      return [];
    }
    
    // Get all friends' data
    const friends: UserData[] = [];
    
    for (const friendId of friendIds) {
      const friendDocRef = doc(firestore, 'users', friendId);
      const friendDoc = await getDoc(friendDocRef);
      
      if (friendDoc.exists()) {
        const friendData = friendDoc.data() as UserData;
        friends.push({
          ...friendData,
          uid: friendDoc.id,
        });
      }
    }
    
    return friends;
  } catch (error) {
    console.error('Error getting user friends:', error);
    throw error;
  }
};

// Function to log and verify friend relationship between two users
export const logFriendsRelationship = async (userId: string, friendId: string): Promise<boolean> => {
  try {
    console.log(`Checking friendship between user ${userId} and friend ${friendId}`);
    
    // Get both user documents
    const userDocRef = doc(firestore, 'users', userId);
    const friendDocRef = doc(firestore, 'users', friendId);
    
    const [userDoc, friendDoc] = await Promise.all([
      getDoc(userDocRef),
      getDoc(friendDocRef)
    ]);
    
    if (!userDoc.exists() || !friendDoc.exists()) {
      console.error('One or both users do not exist');
      return false;
    }
    
    const userData = userDoc.data();
    const friendData = friendDoc.data();
    
    const userHasFriend = (userData.friends || []).includes(friendId);
    const friendHasUser = (friendData.friends || []).includes(userId);
    
    console.log(`User has friend: ${userHasFriend}`);
    console.log(`Friend has user: ${friendHasUser}`);
    
    // If relationship is one-sided, fix it
    if (userHasFriend && !friendHasUser) {
      console.log('Fixing one-sided friendship: adding user to friend\'s list');
      await updateDoc(friendDocRef, {
        friends: arrayUnion(userId)
      });
      return true;
    } else if (!userHasFriend && friendHasUser) {
      console.log('Fixing one-sided friendship: adding friend to user\'s list');
      await updateDoc(userDocRef, {
        friends: arrayUnion(friendId)
      });
      return true;
    }
    
    return userHasFriend && friendHasUser;
  } catch (error) {
    console.error('Error checking friend relationship:', error);
    return false;
  }
}; 