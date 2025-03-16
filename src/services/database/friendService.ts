import { ref, onValue, get } from 'firebase/database';
import { database } from '../../firebase/config';
import { FriendData } from '../../types/friend';

export const getFriends = async (userId: string): Promise<FriendData[]> => {
  try {
    const friendsRef = ref(database, `users/${userId}/friends`);
    const snapshot = await get(friendsRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const friendsData = snapshot.val();
    const friends: FriendData[] = [];

    for (const friendId in friendsData) {
      const userRef = ref(database, `users/${friendId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        friends.push({
          id: friendId,
          displayName: userData.displayName || 'Anonymous',
          photoURL: userData.photoURL || null,
          isShitting: userData.isShitting || false,
        });
      }
    }

    return friends;
  } catch (error) {
    console.error('Error fetching friends:', error);
    throw error;
  }
}; 