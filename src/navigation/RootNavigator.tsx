import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';

import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { STORAGE_KEYS, APP_STATE, TIME } from '../constants/app';
import SplashScreen from '../screens/SplashScreen';
import ErrorHandlingScreen from '../screens/examples/ErrorHandlingScreen';
import { theme } from '../theme';

// Create the root stack navigator
const Stack = createStackNavigator<RootStackParamList>();

/**
 * App state manager that handles app state changes
 */
const AppStateManager: React.FC = () => {
  const { currentUser, userData, updateUserStatus } = useAuth();
  
  useEffect(() => {
    // Function to handle app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Capture previous state
      const previousState = await AsyncStorage.getItem(STORAGE_KEYS.APP_STATE) || '';
      
      console.log(`App state changing from ${previousState} to ${nextAppState}`);
      
      if (nextAppState === APP_STATE.ACTIVE) {
        // App is coming to the foreground
        
        // Only check for app termination if returning from background
        if (previousState === APP_STATE.BACKGROUND) {
          console.log('App returning to foreground from background');
          
          // Get last stored timestamps
          const lastActiveTimestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_TIMESTAMP);
          const wasShitting = await AsyncStorage.getItem(STORAGE_KEYS.SHITTING_STATE);
          
          if (lastActiveTimestamp && wasShitting === 'true') {
            const timeSinceLastActive = Date.now() - parseInt(lastActiveTimestamp);
            
            console.log(`Time since last active: ${timeSinceLastActive}ms`);
            
            // If the time gap is significant, the app was likely terminated
            if (timeSinceLastActive > TIME.APP_CLOSURE_THRESHOLD) {
              console.log('App was likely closed while shitting. Turning off status.');
              
              // Reset shitting status
              await updateUserStatus(false);
              
              // Clear stored shitting state
              await AsyncStorage.setItem(STORAGE_KEYS.SHITTING_STATE, 'false');
            } else {
              console.log('App was just backgrounded, maintaining status');
            }
          }
        }
        
        // Start regular updates of the last active timestamp
        updateLastActiveTimestamp();
        
      } else if (nextAppState === APP_STATE.BACKGROUND) {
        // App is going to the background
        console.log('App going to background');
        
        // Store if user is currently shitting
        if (userData?.isShitting) {
          await AsyncStorage.setItem(STORAGE_KEYS.SHITTING_STATE, 'true');
        } else {
          await AsyncStorage.setItem(STORAGE_KEYS.SHITTING_STATE, 'false');
        }
        
        // Final timestamp update before backgrounding
        updateLastActiveTimestamp();
      }
      
      // Update stored app state
      await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, nextAppState);
    };
    
    // Function to update the last active timestamp
    const updateLastActiveTimestamp = async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TIMESTAMP, Date.now().toString());
    };
    
    // Set initial state values
    const initializeState = async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, AppState.currentState);
      updateLastActiveTimestamp();
      
      // Store initial shitting state
      if (userData) {
        await AsyncStorage.setItem(STORAGE_KEYS.SHITTING_STATE, userData.isShitting ? 'true' : 'false');
      }
    };
    
    // Initialize state
    initializeState();
    
    // Start a foreground interval to regularly update active timestamp
    // This helps establish a reliable "heartbeat" pattern while the app is active
    const activeInterval = setInterval(updateLastActiveTimestamp, TIME.STATUS_UPDATE_INTERVAL);
    
    // Set up the app state change listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      // Clean up
      subscription.remove();
      clearInterval(activeInterval);
    };
  }, [currentUser, userData, updateUserStatus]);
  
  // This component doesn't render anything
  return null;
};

/**
 * Root Navigator that checks auth state
 * Renders the appropriate stack based on authentication
 */
const RootNavigator: React.FC = () => {
  const { currentUser, loading } = useAuth();
  
  // Show splash screen while checking auth state
  if (loading) {
    return <SplashScreen />;
  }
  
  return (
    <>
      <AppStateManager />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background.default,
          },
          headerTintColor: theme.colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        {currentUser ? (
          <>
            <Stack.Screen 
              name="Main" 
              component={MainNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ErrorHandling" 
              component={ErrorHandlingScreen}
              options={{ title: 'Error Handling Demo' }} 
            />
          </>
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator} 
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </>
  );
};

export default RootNavigator; 