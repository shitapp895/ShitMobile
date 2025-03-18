import { useState } from 'react';
import { Alert } from 'react-native';
import { searchUsers } from '../services/database/userService';
import { checkPendingRequest } from '../services/database/friendRequestService';
import { UserSearchResult } from '../types/friend';

export const useUserSearch = (userId: string) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);

  // Handle search for users
  const handleSearchUsers = async (query: string) => {
    if (!query.trim() || !userId) {
      clearSearch();
      return;
    }

    try {
      setSearching(true);
      setSearchQuery(query);

      // Search for users
      const results = await searchUsers(query);
      
      // Filter out the current user
      const filteredResults = results.filter(user => user.id !== userId);
      
      // Check for pending requests for each user
      const resultsWithRequestStatus = await Promise.all(
        filteredResults.map(async (user) => {
          const pendingRequest = await checkPendingRequest(userId, user.id);
          return {
            ...user,
            pendingRequestId: pendingRequest?.id
          };
        })
      );

      setSearchResults(resultsWithRequestStatus);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search for users. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update search result when a friend request is sent
  const updateWhenRequestSent = (userId: string, requestId: string) => {
    setSearchResults(prev =>
      prev.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            pendingRequestId: requestId
          };
        }
        return user;
      })
    );
  };

  // Update search result when a friend request is canceled
  const updateWhenRequestCanceled = (userId: string) => {
    setSearchResults(prev =>
      prev.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            pendingRequestId: undefined
          };
        }
        return user;
      })
    );
  };

  return {
    searchQuery,
    searchResults,
    searching,
    addingFriend,
    handleSearchUsers,
    clearSearch,
    setAddingFriend,
    updateWhenRequestSent,
    updateWhenRequestCanceled
  };
}; 