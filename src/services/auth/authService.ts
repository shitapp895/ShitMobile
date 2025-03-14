import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, set, onValue, onDisconnect } from 'firebase/database';

import { auth, firestore, database } from '../../firebase/config';
import { STORAGE_KEYS } from '../../constants/app';

// Generate a unique session ID
const generateSessionId = (): string => {
  return Math.random().toString(36).substring(2);
};

// Types
export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isOnline: boolean;
  isShitting: boolean;
  lastActive: number;
  totalShits?: number;
  averageShitDuration?: number;
  lastShitStartTime?: number;
  friends?: string[];
  totalShitDuration?: number;
}

// Auth service functions
export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string
): Promise<User> => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, {
      displayName,
    });
    
    // Create user document in Firestore
    const userData: UserData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isOnline: true,
      isShitting: false,
      lastActive: Date.now(),
      totalShits: 0,
      averageShitDuration: 0,
      totalShitDuration: 0,
      friends: [],
    };
    
    await setDoc(doc(firestore, 'users', user.uid), userData);
    
    // Set online status in Realtime Database
    const sessionId = generateSessionId();
    const userStatusRef = ref(database, `status/${user.uid}`);
    
    await set(userStatusRef, {
      isOnline: true,
      isShitting: false,
      lastActive: Date.now(),
      sessionId,
    });
    
    // Configure disconnect handler
    onDisconnect(userStatusRef).update({
      isOnline: false,
      lastActive: Date.now(),
    });
    
    return user;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

export const loginUser = async (
  email: string, 
  password: string
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update online status
    const sessionId = generateSessionId();
    const userStatusRef = ref(database, `status/${user.uid}`);
    
    await set(userStatusRef, {
      isOnline: true,
      isShitting: false,
      lastActive: Date.now(),
      sessionId,
    });
    
    // Configure disconnect handler
    onDisconnect(userStatusRef).update({
      isOnline: false,
      lastActive: Date.now(),
    });
    
    return user;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    
    if (user) {
      // Update status to offline
      const userStatusRef = ref(database, `status/${user.uid}`);
      await set(userStatusRef, {
        isOnline: false,
        isShitting: false,
        lastActive: Date.now(),
      });
    }
    
    await signOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const subscribeToAuthChanges = (
  callback: (user: User | null) => void
): () => void => {
  return onAuthStateChanged(auth, callback);
};

export const updateUserStatus = async (isShitting: boolean): Promise<void> => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No authenticated user');
  }
  
  try {
    // Update Realtime Database status
    const userStatusRef = ref(database, `status/${user.uid}`);
    await set(userStatusRef, {
      isOnline: true,
      isShitting,
      lastActive: Date.now(),
    });
    
    // Update Firestore document
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      
      // If starting to shit, record start time
      if (isShitting && !userData.isShitting) {
        await updateDoc(userDocRef, {
          isShitting: true,
          lastShitStartTime: Date.now(),
        });
      }
      
      // If ending a shit, update stats
      if (!isShitting && userData.isShitting && userData.lastShitStartTime) {
        const shitDuration = Date.now() - userData.lastShitStartTime;
        const totalShits = (userData.totalShits || 0) + 1;
        const totalShitDuration = (userData.totalShitDuration || 0) + shitDuration;
        const averageShitDuration = totalShitDuration / totalShits;
        
        await updateDoc(userDocRef, {
          isShitting: false,
          totalShits,
          totalShitDuration,
          averageShitDuration,
        });
      }
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

export const fetchUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDocRef = doc(firestore, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

export const updateUserProfile = async (
  displayName: string,
  photoURL: string
): Promise<void> => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No authenticated user');
  }
  
  try {
    // Update auth profile
    await updateProfile(user, {
      displayName,
      photoURL,
    });
    
    // Update Firestore document
    const userDocRef = doc(firestore, 'users', user.uid);
    await updateDoc(userDocRef, {
      displayName,
      photoURL,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}; 