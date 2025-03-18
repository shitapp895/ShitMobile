import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check if required environment variables are set
const requiredKeys = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_DATABASE_URL',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const getFirebaseConfig = () => {
  // For Expo apps, access environment variables from app.json via Constants.expoConfig.extra
  const expoConfig = Constants.expoConfig?.extra;
  
  if (!expoConfig) {
    console.error('Missing Expo configuration. Please ensure you have a proper app.json setup.');
    throw new Error('Missing Expo configuration in app.json');
  }
  
  const missingKeys = requiredKeys.filter(key => !expoConfig[key]);
  
  if (missingKeys.length > 0) {
    console.error(
      `Missing required Firebase configuration keys: ${missingKeys.join(', ')}. ` +
      `Please check your app.json file and ensure all Firebase configuration is properly set.`
    );
    throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
  }
  
  // Log the config for debugging (remove in production)
  console.log('Firebase config loaded successfully:', {
    projectId: expoConfig.FIREBASE_PROJECT_ID,
    authDomain: expoConfig.FIREBASE_AUTH_DOMAIN,
    databaseURL: expoConfig.FIREBASE_DATABASE_URL
  });
  
  return {
    apiKey: expoConfig.FIREBASE_API_KEY,
    authDomain: expoConfig.FIREBASE_AUTH_DOMAIN,
    projectId: expoConfig.FIREBASE_PROJECT_ID,
    storageBucket: expoConfig.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: expoConfig.FIREBASE_MESSAGING_SENDER_ID,
    appId: expoConfig.FIREBASE_APP_ID,
    databaseURL: expoConfig.FIREBASE_DATABASE_URL
  };
};

// Initialize Firebase
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore with persistence enabled
const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager()
  })
});

const database = getDatabase(app);

export { app, auth, firestore, database }; 