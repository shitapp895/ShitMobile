import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as authService from '../services/auth/authService';
import { STORAGE_KEYS } from '../constants/app';

export interface AuthHookResult {
  currentUser: User | null;
  userData: authService.UserData | null;
  loading: boolean;
  error: Error | null;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserStatus: (isShitting: boolean) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL: string) => Promise<void>;
}

export const useAuth = (): AuthHookResult => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<authService.UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch user data from Firestore
  const fetchUserData = useCallback(async (user: User) => {
    try {
      const data = await authService.fetchUserData(user.uid);
      setUserData(data);
      
      // Cache the user data for offline access
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Try to get data from cache if possible
      const cachedUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (cachedUserData) {
        setUserData(JSON.parse(cachedUserData));
      }
    }
  }, []);

  // Effect to subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // User is signed in
        // Set in AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }));
        
        // Fetch additional user data
        await fetchUserData(user);
      } else {
        // User is signed out
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        setUserData(null);
      }
      
      setLoading(false);
    });
    
    // Cleanup
    return () => unsubscribe();
  }, [fetchUserData]);

  // Registration function
  const register = async (
    email: string, 
    password: string, 
    displayName: string
  ): Promise<void> => {
    setError(null);
    
    try {
      setLoading(true);
      await authService.registerUser(email, password, displayName);
      // Auth state listener will handle the rest
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    setError(null);
    
    try {
      setLoading(true);
      await authService.loginUser(email, password);
      // Auth state listener will handle the rest
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setError(null);
    
    try {
      setLoading(true);
      await authService.logoutUser();
      // Auth state listener will handle the rest
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update user status (shitting status)
  const updateUserStatus = async (isShitting: boolean): Promise<void> => {
    setError(null);
    
    if (!currentUser) {
      const err = new Error('No authenticated user');
      setError(err);
      throw err;
    }
    
    try {
      await authService.updateUserStatus(isShitting);
      
      // Update local state
      setUserData((prevData) => {
        if (prevData) {
          return {
            ...prevData,
            isShitting,
          };
        }
        return prevData;
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  // Update user profile
  const updateUserProfile = async (
    displayName: string, 
    photoURL: string
  ): Promise<void> => {
    setError(null);
    
    if (!currentUser) {
      const err = new Error('No authenticated user');
      setError(err);
      throw err;
    }
    
    try {
      await authService.updateUserProfile(displayName, photoURL);
      
      // Update local state
      setUserData((prevData) => {
        if (prevData) {
          return {
            ...prevData,
            displayName,
            photoURL,
          };
        }
        return prevData;
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    currentUser,
    userData,
    loading,
    error,
    register,
    login,
    logout,
    updateUserStatus,
    updateUserProfile,
  };
}; 