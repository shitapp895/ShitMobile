import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TextStyle } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import ShweetsScreen from '../screens/ShweetsScreen';
import GamesScreen from '../screens/GamesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { MainTabParamList } from './types';
import { theme } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main Tab Navigator
 * Handles the main application tabs after authentication
 */
const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Shweets') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Games') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary.main,
        tabBarInactiveTintColor: theme.colors.gray[500],
        headerStyle: {
          backgroundColor: theme.colors.background.default,
        },
        headerTitleStyle: {
          color: theme.colors.text.primary,
          fontWeight: '600',
        } as TextStyle,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen} 
        options={{
          title: 'Friends',
        }}
      />
      <Tab.Screen 
        name="Shweets" 
        component={ShweetsScreen} 
        options={{
          title: 'Shweets',
        }}
      />
      <Tab.Screen 
        name="Games" 
        component={GamesScreen} 
        options={{
          title: 'Games',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator; 