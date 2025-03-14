import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

// Root Navigator that checks auth state
function RootNavigator() {
  const { currentUser, loading } = useAuth();
  
  // Show loading screen while checking auth state
  if (loading) {
    return null; // In a real app, you'd show a splash screen here
  }
  
  return currentUser ? <MainNavigator /> : <AuthNavigator />;
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
