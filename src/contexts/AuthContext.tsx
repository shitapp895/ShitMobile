import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  AuthErrorCodes,
} from 'firebase/auth';
import { ref, set, onValue, onDisconnect, get } from 'firebase/database';
import { doc, setDoc, getDoc, updateDoc, collection } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, firestore, database } from '../firebase/config';

// Generate a unique session ID for this app instance
const sessionId = Math.random().toString(36).substring(2);

interface UserData {
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

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserStatus: (isShitting: boolean) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Set online status in Realtime Database
        const userStatusRef = ref(database, `status/${user.uid}`);
        const isOfflineForDatabase = {
          isOnline: false,
          lastChanged: Date.now(),
        };
        const isOnlineForDatabase = {
          isOnline: true,
          lastChanged: Date.now(),
        };

        // Create a reference to the special '.info/connected' path in Realtime Database
        const connectedRef = ref(database, '.info/connected');
        onValue(connectedRef, (snapshot) => {
          if (snapshot.val() === true) {
            // We're connected (or reconnected)!
            // Set up our online presence
            const statusRef = ref(database, `status/${user.uid}`);
            
            // When we disconnect, update the status to offline
            onDisconnect(statusRef).set(isOfflineForDatabase);
            
            // Set our status to online
            set(statusRef, isOnlineForDatabase);
          }
        });

        // Get user data from Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Register a new user
  async function register(email: string, password: string, displayName: string) {
    try {
      console.log('Attempting to register with:', { email, displayName });
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('User registered successfully, updating profile');
      
      // Update profile with display name
      await updateProfile(user, { displayName });
      
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
      
      console.log('Creating user document in Firestore');
      await setDoc(doc(firestore, 'users', user.uid), userData);
      
      // Set initial status in Realtime Database
      console.log('Setting initial status in Realtime Database');
      await set(ref(database, `status/${user.uid}`), {
        state: 'online',
        lastChanged: Date.now(),
      });
      
      console.log('Registration complete');
    } catch (error: any) {
      console.error('Error registering user:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to register. Please check your network connection and try again.';
      
      if (error.code) {
        switch(error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already in use. Please use a different email or log in.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is invalid. Please check and try again.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please use a stronger password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid credentials. Please check your API keys and Firebase configuration.';
            break;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Login user
  async function login(email: string, password: string) {
    try {
      console.log('Attempting to login with:', email);
      
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
      
      // Update status in both Firestore and Realtime Database
      const currentTime = Date.now();
      
      // 1. Reset shitting status in Firestore
      const userDocRef = doc(firestore, 'users', userCredential.user.uid);
      await updateDoc(userDocRef, {
        isShitting: false,
        lastActive: currentTime
      });
      
      // 2. Reset status in Realtime Database
      const statusRef = ref(database, `status/${userCredential.user.uid}`);
      const statusSnapshot = await get(statusRef);
      const statusData = statusSnapshot.exists() ? statusSnapshot.val() : {};
      
      await set(statusRef, {
        isOnline: true,
        isShitting: false,
        lastActive: currentTime,
        lastShitStartTime: null,
        sessions: { ...(statusData.sessions || {}), [sessionId]: true }
      });
      
      // Set up disconnect handler
      onDisconnect(ref(database, `status/${userCredential.user.uid}/sessions/${sessionId}`)).remove();
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Improve error messages for common issues
      if (error instanceof Error) {
        const errorCode = error.name || '';
        
        if (errorCode === AuthErrorCodes.INVALID_LOGIN_CREDENTIALS) {
          throw new Error('Invalid email or password. Please try again.');
        } else if (errorCode === AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER) {
          throw new Error('Too many login attempts. Please try again later.');
        } else {
          throw new Error('Failed to log in. Please check your credentials and try again.');
        }
      } else {
        throw new Error('An unexpected error occurred during login.');
      }
    }
  }

  // Logout user
  async function logout() {
    try {
      // Set status to offline before signing out
      if (currentUser) {
        await set(ref(database, `status/${currentUser.uid}`), {
          state: 'offline',
          lastChanged: Date.now(),
        });
      }
      
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }

  // Update user status (shitting or not)
  async function updateUserStatus(isShitting: boolean) {
    if (!currentUser) return;
    
    try {
      const currentTime = Date.now();
      
      // 1. First update the user document in Firestore
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      
      if (isShitting) {
        // Starting a shit session
        await updateDoc(userDocRef, {
          isShitting: true,
          lastShitStartTime: currentTime,
        });
      } else {
        // Ending a shit session
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data() as UserData;
        
        if (userData.lastShitStartTime) {
          const shitDuration = currentTime - userData.lastShitStartTime;
          const totalShits = (userData.totalShits || 0) + 1;
          const totalShitDuration = (userData.totalShitDuration || 0) + shitDuration;
          const averageShitDuration = totalShitDuration / totalShits;
          
          await updateDoc(userDocRef, {
            isShitting: false,
            totalShits,
            totalShitDuration,
            averageShitDuration,
          });
        } else {
          await updateDoc(userDocRef, {
            isShitting: false,
          });
        }
      }
      
      // 2. Now ALSO update the Realtime Database to stay in sync with web app
      // Get the current status to preserve any existing sessions
      const statusRef = ref(database, `status/${currentUser.uid}`);
      const statusSnapshot = await get(statusRef);
      const statusData = statusSnapshot.exists() ? statusSnapshot.val() : {};
      
      // Update the status with new shitting state while preserving sessions
      await set(statusRef, {
        isOnline: true,
        isShitting: isShitting,
        lastActive: currentTime,
        lastShitStartTime: isShitting ? currentTime : null,
        sessions: { ...(statusData.sessions || {}), [sessionId]: true },
      });
      
      // Setup disconnect handler to remove this session when the app closes
      onDisconnect(ref(database, `status/${currentUser.uid}/sessions/${sessionId}`)).remove();
      
      // 3. Update AsyncStorage for our app state management
      try {
        await AsyncStorage.setItem('@ShitApp:isShitting', isShitting ? 'true' : 'false');
        await AsyncStorage.setItem('@ShitApp:lastActiveTimestamp', currentTime.toString());
      } catch (storageError) {
        console.error('Error updating AsyncStorage:', storageError);
        // Continue anyway - the Firebase updates are more important
      }
      
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(displayName: string, photoURL: string) {
    if (!currentUser) return;
    
    try {
      await updateProfile(currentUser, { displayName, photoURL });
      
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName,
        photoURL,
      });
      
      // Update local userData state to reflect the changes
      setUserData(prevUserData => {
        if (prevUserData) {
          return {
            ...prevUserData,
            displayName,
            photoURL,
          };
        }
        return prevUserData;
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  const value = {
    currentUser,
    userData,
    loading,
    register,
    login,
    logout,
    updateUserStatus,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 