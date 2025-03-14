import { NavigatorScreenParams } from '@react-navigation/native';

// Auth stack navigation types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Main tab navigation types
export type MainTabParamList = {
  Home: undefined;
  Friends: undefined;
  Shweets: undefined;
  Games: undefined;
  Profile: undefined;
};

// Define other navigation params as needed
export type ShweetDetailsParams = {
  shweetId: string;
};

export type UserProfileParams = {
  userId: string;
};

// Root navigator parameters
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  ShweetDetails: ShweetDetailsParams;
  UserProfile: UserProfileParams;
  ErrorHandling: undefined;
}; 