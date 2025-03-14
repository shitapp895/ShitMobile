import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import * as shweetService from '../services/database/shweetService';
import * as userService from '../services/database/userService';

export interface UseShweetsResult {
  shweets: shweetService.Shweet[];
  userShweets: shweetService.Shweet[];
  friendsShweets: shweetService.Shweet[];
  loading: boolean;
  error: Error | null;
  createShweet: (content: string, isFromToilet: boolean) => Promise<void>;
  likeShweet: (shweetId: string) => Promise<void>;
  unlikeShweet: (shweetId: string) => Promise<void>;
  deleteShweet: (shweetId: string) => Promise<void>;
  refreshShweets: () => Promise<void>;
  addComment: (shweetId: string, content: string, isFromToilet: boolean) => Promise<void>;
  getComments: (shweetId: string) => Promise<shweetService.ShweetComment[]>;
}

export const useShweets = (): UseShweetsResult => {
  const { currentUser, userData } = useAuth();
  const [shweets, setShweets] = useState<shweetService.Shweet[]>([]);
  const [userShweets, setUserShweets] = useState<shweetService.Shweet[]>([]);
  const [friendsShweets, setFriendsShweets] = useState<shweetService.Shweet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Create a new shweet
  const createShweet = async (content: string, isFromToilet: boolean): Promise<void> => {
    if (!currentUser || !userData) {
      const err = new Error('User not authenticated');
      setError(err);
      throw err;
    }
    
    try {
      const newShweet = await shweetService.createShweet({
        authorId: currentUser.uid,
        authorName: userData.displayName || 'Anonymous',
        authorPhotoURL: userData.photoURL,
        content,
        timestamp: new Date(),
        isFromToilet,
        likes: [],
        comments: 0,
      });
      
      // Update local state
      setShweets((prevShweets) => [newShweet, ...prevShweets]);
      setUserShweets((prevShweets) => [newShweet, ...prevShweets]);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };
  
  // Like a shweet
  const likeShweet = async (shweetId: string): Promise<void> => {
    if (!currentUser) {
      const err = new Error('User not authenticated');
      setError(err);
      throw err;
    }
    
    try {
      await shweetService.likeShweet(shweetId, currentUser.uid);
      
      // Update local state
      const updateShweetLikes = (prevShweets: shweetService.Shweet[]) => 
        prevShweets.map((shweet) => {
          if (shweet.id === shweetId) {
            return {
              ...shweet,
              likes: [...shweet.likes, currentUser.uid],
            };
          }
          return shweet;
        });
      
      setShweets(updateShweetLikes);
      setUserShweets(updateShweetLikes);
      setFriendsShweets(updateShweetLikes);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };
  
  // Unlike a shweet
  const unlikeShweet = async (shweetId: string): Promise<void> => {
    if (!currentUser) {
      const err = new Error('User not authenticated');
      setError(err);
      throw err;
    }
    
    try {
      await shweetService.unlikeShweet(shweetId, currentUser.uid);
      
      // Update local state
      const updateShweetLikes = (prevShweets: shweetService.Shweet[]) => 
        prevShweets.map((shweet) => {
          if (shweet.id === shweetId) {
            return {
              ...shweet,
              likes: shweet.likes.filter((id) => id !== currentUser.uid),
            };
          }
          return shweet;
        });
      
      setShweets(updateShweetLikes);
      setUserShweets(updateShweetLikes);
      setFriendsShweets(updateShweetLikes);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };
  
  // Delete a shweet
  const deleteShweet = async (shweetId: string): Promise<void> => {
    try {
      await shweetService.deleteShweet(shweetId);
      
      // Update local state
      const filterShweets = (prevShweets: shweetService.Shweet[]) => 
        prevShweets.filter((shweet) => shweet.id !== shweetId);
      
      setShweets(filterShweets);
      setUserShweets(filterShweets);
      setFriendsShweets(filterShweets);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };
  
  // Add a comment to a shweet
  const addComment = async (
    shweetId: string, 
    content: string, 
    isFromToilet: boolean
  ): Promise<void> => {
    if (!currentUser || !userData) {
      const err = new Error('User not authenticated');
      setError(err);
      throw err;
    }
    
    try {
      await shweetService.addComment({
        shweetId,
        authorId: currentUser.uid,
        authorName: userData.displayName || 'Anonymous',
        authorPhotoURL: userData.photoURL,
        content,
        timestamp: new Date(),
        isFromToilet,
      });
      
      // Update local state - increment comment count
      const updateCommentCount = (prevShweets: shweetService.Shweet[]) => 
        prevShweets.map((shweet) => {
          if (shweet.id === shweetId) {
            return {
              ...shweet,
              comments: shweet.comments + 1,
            };
          }
          return shweet;
        });
      
      setShweets(updateCommentCount);
      setUserShweets(updateCommentCount);
      setFriendsShweets(updateCommentCount);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };
  
  // Get comments for a shweet
  const getComments = async (shweetId: string): Promise<shweetService.ShweetComment[]> => {
    try {
      return await shweetService.getShweetComments(shweetId);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };
  
  // Fetch all shweets
  const fetchShweets = useCallback(async () => {
    try {
      const recentShweets = await shweetService.getRecentShweets(50);
      setShweets(recentShweets);
    } catch (err) {
      setError(err as Error);
    }
  }, []);
  
  // Fetch user's shweets
  const fetchUserShweets = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const userShweets = await shweetService.getUserShweets(currentUser.uid);
      setUserShweets(userShweets);
    } catch (err) {
      setError(err as Error);
    }
  }, [currentUser]);
  
  // Fetch friends' shweets
  const fetchFriendsShweets = useCallback(async () => {
    if (!currentUser || !userData) return;
    
    try {
      const friendIds = userData.friends || [];
      
      if (friendIds.length > 0) {
        const friendsShweets = await shweetService.getFriendsShweets(friendIds);
        setFriendsShweets(friendsShweets);
      }
    } catch (err) {
      setError(err as Error);
    }
  }, [currentUser, userData]);
  
  // Refresh all shweets
  const refreshShweets = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchShweets(),
        fetchUserShweets(),
        fetchFriendsShweets(),
      ]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    if (currentUser) {
      refreshShweets();
    } else {
      setShweets([]);
      setUserShweets([]);
      setFriendsShweets([]);
      setLoading(false);
    }
  }, [currentUser, fetchShweets, fetchUserShweets, fetchFriendsShweets]);
  
  return {
    shweets,
    userShweets,
    friendsShweets,
    loading,
    error,
    createShweet,
    likeShweet,
    unlikeShweet,
    deleteShweet,
    refreshShweets,
    addComment,
    getComments,
  };
}; 