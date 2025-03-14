// App-wide constants

// App state constants
export const APP_STATE = {
  ACTIVE: 'active',
  BACKGROUND: 'background',
  INACTIVE: 'inactive',
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_USER: '@ShitApp:authUser',
  USER_DATA: '@ShitApp:userData',
  LAST_ACTIVE_TIMESTAMP: '@ShitApp:lastActiveTimestamp',
  SHITTING_STATE: '@ShitApp:isShitting',
  APP_STATE: '@ShitApp:appState',
  SESSION_ID: '@ShitApp:sessionId',
};

// Time constants (in milliseconds)
export const TIME = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  APP_CLOSURE_THRESHOLD: 30 * 1000, // 30 seconds for app closure detection
  STATUS_UPDATE_INTERVAL: 5000, // 5 seconds for status updates
};

// API endpoints
export const API_ENDPOINTS = {
  USERS: '/users',
  FRIENDS: '/friends',
  SHWEETS: '/shweets',
  GAMES: '/games',
};

// Default values
export const DEFAULTS = {
  PROFILE_IMAGE: 'https://ui-avatars.com/api/?background=random',
  USERNAME: 'Anonymous',
};

// User status
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SHITTING: 'shitting',
};

// Error messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_EMAIL: 'The email address is invalid.',
    WEAK_PASSWORD: 'The password is too weak.',
    EMAIL_IN_USE: 'The email address is already in use.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    USER_NOT_FOUND: 'User not found.',
  },
  NETWORK: {
    CONNECTION_ERROR: 'Network connection error. Please try again.',
    TIMEOUT: 'Request timed out. Please try again.',
  },
  FORM: {
    REQUIRED_FIELD: 'This field is required.',
    INVALID_EMAIL_FORMAT: 'Please enter a valid email address.',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',
    PASSWORDS_DO_NOT_MATCH: 'Passwords do not match.',
  },
}; 