import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useError } from '../../../contexts/ErrorContext';
import { theme } from '../../../theme';
import Typography from '../Typography/Typography';
import Button from '../Button/Button';

/**
 * Component that monitors network connectivity and shows appropriate messages
 */
const NetworkStatus: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const { showError, hideError } = useError();

  // Handle network state changes
  const handleNetworkChange = useCallback((state: NetInfoState) => {
    const offline = !state.isConnected || !state.isInternetReachable;
    
    if (offline && !isOffline) {
      // We just went offline
      showError(
        'No internet connection. Some features may be unavailable.',
        'banner'
      );
      setIsOffline(true);
    } else if (!offline && isOffline) {
      // We're back online
      hideError();
      setIsOffline(false);
    }
  }, [isOffline, showError, hideError]);

  // Set up network listener when component mounts
  useEffect(() => {
    // Check initial state
    NetInfo.fetch().then(handleNetworkChange);
    
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);
    
    // Clean up listener on unmount
    return () => {
      unsubscribe();
      if (isOffline) {
        hideError();
      }
    };
  }, [handleNetworkChange, hideError, isOffline]);

  // This component doesn't render anything itself
  // It just manages the network state and error messages
  return null;
};

export default NetworkStatus; 