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
  totalShits: number;
  averageShitDuration: number;
  totalShitDuration: number;
  friends: string[];
  // These fields are merged from userStatus for UI compatibility
  isOnline?: boolean;
  isShitting?: boolean;
  lastActive?: number;
  lastShitStartTime?: number | null;
}

interface UserStatus {
  isOnline: boolean;
  isShitting: boolean;
  lastActive: number;
  lastShitStartTime: number | null;
  sessions?: { [key: string]: boolean };
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
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
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
          isShitting: false,
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
            
            // When we disconnect, update the status to offline AND reset shitting status
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

        // Listen for status changes in Realtime Database
        const statusRef = ref(database, `status/${user.uid}`);
        onValue(statusRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserStatus(snapshot.val() as UserStatus);
          }
        });
      } else {
        setUserData(null);
        setUserStatus(null);
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
        isOnline: true,
        isShitting: false,
        lastActive: Date.now(),
        lastShitStartTime: null,
        sessions: { [sessionId]: true }
      });
      
      // Set up disconnect handler
      onDisconnect(ref(database, `status/${user.uid}/sessions/${sessionId}`)).remove();
      
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
      
      // 1. Reset shitting status in Realtime Database
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
      
      // Set up disconnect handler to remove this session and reset status when disconnected
      const statusResetData = {
        isOnline: false,
        isShitting: false,
        lastChanged: currentTime,
      };
      onDisconnect(ref(database, `status/${userCredential.user.uid}`)).update(statusResetData);
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
          isOnline: false,
          isShitting: false,
          lastActive: Date.now(),
          lastShitStartTime: null
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
      
      // 1. Update the Realtime Database status
      const statusRef = ref(database, `status/${currentUser.uid}`);
      const statusSnapshot = await get(statusRef);
      const statusData = statusSnapshot.exists() ? statusSnapshot.val() : {};
      
      if (isShitting) {
        // Starting a shit session
        await set(statusRef, {
          isOnline: true,
          isShitting: true,
          lastActive: currentTime,
          lastShitStartTime: currentTime,
          sessions: { ...(statusData.sessions || {}), [sessionId]: true }
        });
      } else {
        // Ending a shit session
        const currentStatus = statusSnapshot.val();
        
        if (currentStatus?.lastShitStartTime) {
          const shitDuration = currentTime - currentStatus.lastShitStartTime;
          
          // Only count shits that are at least 2 minutes long
          const MIN_SHIT_DURATION = 120000; // 2 minutes in milliseconds
          
          // First update Firestore with the stats if eligible
          const userDocRef = doc(firestore, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.data() as UserData;
          
          // Important: Update Firestore first and wait for it to complete before updating RTDB
          if (shitDuration >= MIN_SHIT_DURATION) {
            // Update statistics in Firestore
            const totalShits = (userData.totalShits || 0) + 1;
            const totalShitDuration = (userData.totalShitDuration || 0) + shitDuration;
            const averageShitDuration = totalShitDuration / totalShits;
            
            console.log(`Updating stats: Duration=${shitDuration}ms, Total=${totalShits}`);
            
            // Wait for the Firestore update to complete before updating RTDB
            await updateDoc(userDocRef, {
              totalShits,
              totalShitDuration,
              averageShitDuration,
            });
          } else {
            console.log(`Shit duration (${shitDuration}ms) less than minimum (${MIN_SHIT_DURATION}ms), not counting towards stats`);
          }
          
          // Only update RTDB after Firestore update is complete
          // This prevents race conditions where RTDB triggers a refresh before Firestore completes
          await set(statusRef, {
            isOnline: true,
            isShitting: false,
            lastActive: currentTime,
            lastShitStartTime: null,
            sessions: { ...(statusData.sessions || {}), [sessionId]: true }
          });
        } else {
          // No shit in progress, just update status
          await set(statusRef, {
            isOnline: true,
            isShitting: false,
            lastActive: currentTime,
            lastShitStartTime: null,
            sessions: { ...(statusData.sessions || {}), [sessionId]: true }
          });
        }
      }
      
      // Setup disconnect handler to remove this session and reset status when the app closes
      const statusResetData = {
        isOnline: false,
        isShitting: false,
        lastChanged: currentTime,
      };
      onDisconnect(ref(database, `status/${currentUser.uid}`)).update(statusResetData);
      onDisconnect(ref(database, `status/${currentUser.uid}/sessions/${sessionId}`)).remove();
      
      // Update AsyncStorage for our app state management
      try {
        await AsyncStorage.setItem('@ShitApp:isShitting', isShitting ? 'true' : 'false');
        await AsyncStorage.setItem('@ShitApp:lastActiveTimestamp', currentTime.toString());
      } catch (storageError) {
        console.error('Error updating AsyncStorage:', storageError);
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
    userData: userData ? { 
      ...userData, 
      isShitting: userStatus?.isShitting || false,
      isOnline: userStatus?.isOnline || false,
      lastActive: userStatus?.lastActive || 0,
      lastShitStartTime: userStatus?.lastShitStartTime || 0
    } : null,
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