import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import TweetsScreen from './src/screens/TweetsScreen';
import GamesScreen from './src/screens/GamesScreen';

// Define the types for our navigation
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type MainTabParamList = {
  Home: undefined;
  Friends: undefined;
  Tweets: undefined;
  Games: undefined;
  Profile: undefined;
};

// Create the navigators
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Constants for app state handling
const APP_STATE_ACTIVE = 'active';
const APP_STATE_BACKGROUND = 'background';

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Login">
      <AuthStack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }}
      />
      <AuthStack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ headerShown: false }}
      />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Tweets') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Games') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <MainTab.Screen name="Home" component={HomeScreen} />
      <MainTab.Screen name="Friends" component={FriendsScreen} />
      <MainTab.Screen name="Tweets" component={TweetsScreen} />
      <MainTab.Screen name="Games" component={GamesScreen} />
      <MainTab.Screen name="Profile" component={ProfileScreen} />
    </MainTab.Navigator>
  );
}

// App state manager that handles detecting app closure
function AppStateManager() {
  const { currentUser, userData, updateUserStatus } = useAuth();
  
  useEffect(() => {
    // Constants for tracking app state
    const LAST_ACTIVE_TIMESTAMP_KEY = '@ShitApp:lastActiveTimestamp';
    const SHITTING_STATE_KEY = '@ShitApp:isShitting';
    const APP_CLOSURE_THRESHOLD = 30 * 1000; // 30 seconds (adjust based on testing)
    
    // Function to handle app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Capture previous state
      const previousState = await AsyncStorage.getItem('appState') || '';
      
      console.log(`App state changing from ${previousState} to ${nextAppState}`);
      
      if (nextAppState === APP_STATE_ACTIVE) {
        // App is coming to the foreground
        
        // Only check for app termination if returning from background
        if (previousState === APP_STATE_BACKGROUND) {
          console.log('App returning to foreground from background');
          
          // Get last stored timestamps
          const lastActiveTimestamp = await AsyncStorage.getItem(LAST_ACTIVE_TIMESTAMP_KEY);
          const wasShitting = await AsyncStorage.getItem(SHITTING_STATE_KEY);
          
          if (lastActiveTimestamp && wasShitting === 'true') {
            const timeSinceLastActive = Date.now() - parseInt(lastActiveTimestamp);
            
            console.log(`Time since last active: ${timeSinceLastActive}ms`);
            
            // If the time gap is significant, the app was likely terminated
            if (timeSinceLastActive > APP_CLOSURE_THRESHOLD) {
              console.log('App was likely closed while shitting. Turning off status.');
              
              // Reset shitting status
              await updateUserStatus(false);
              
              // Clear stored shitting state
              await AsyncStorage.setItem(SHITTING_STATE_KEY, 'false');
            } else {
              console.log('App was just backgrounded, maintaining status');
            }
          }
        }
        
        // Start regular updates of the last active timestamp
        updateLastActiveTimestamp();
        
      } else if (nextAppState === APP_STATE_BACKGROUND) {
        // App is going to the background
        console.log('App going to background');
        
        // Store if user is currently shitting
        if (userData?.isShitting) {
          await AsyncStorage.setItem(SHITTING_STATE_KEY, 'true');
        } else {
          await AsyncStorage.setItem(SHITTING_STATE_KEY, 'false');
        }
        
        // Final timestamp update before backgrounding
        updateLastActiveTimestamp();
      }
      
      // Update stored app state
      await AsyncStorage.setItem('appState', nextAppState);
    };
    
    // Function to update the last active timestamp
    const updateLastActiveTimestamp = async () => {
      await AsyncStorage.setItem(LAST_ACTIVE_TIMESTAMP_KEY, Date.now().toString());
    };
    
    // Set initial state values
    const initializeState = async () => {
      await AsyncStorage.setItem('appState', AppState.currentState);
      updateLastActiveTimestamp();
      
      // Store initial shitting state
      if (userData) {
        await AsyncStorage.setItem(SHITTING_STATE_KEY, userData.isShitting ? 'true' : 'false');
      }
    };
    
    // Initialize state
    initializeState();
    
    // Start a foreground interval to regularly update active timestamp
    // This helps establish a reliable "heartbeat" pattern while the app is active
    const activeInterval = setInterval(updateLastActiveTimestamp, 5000);
    
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
}

// Root Navigator that checks auth state
function RootNavigator() {
  const { currentUser, loading } = useAuth();
  
  // Show loading screen while checking auth state
  if (loading) {
    return null; // In a real app, you'd show a splash screen here
  }
  
  return (
    <>
      <AppStateManager />
      {currentUser ? <MainNavigator /> : <AuthNavigator />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
