# ShitApp Mobile

A React Native Expo mobile application for connecting with acquaintances during bathroom breaks.

## Features

- **User Authentication**: Register, login, and manage your profile
- **Real-Time Presence**: See which friends are online and who's currently shitting
- **Friend System**: Add friends and see their status
- **Tweet System**: Share your thoughts with friends
- **Mini-Games**: Play games while you're on the toilet
- **Statistics**: Track your bathroom habits and achievements

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI (` npm install -g expo-cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. Clone the repository
2. Navigate to the mobile-app directory
3. Install dependencies:
   ```
   npm install
   ```
4. Update the Firebase configuration in `app.json` with your Firebase project details
5. Start the development server:
   ```
   npm start
   ```
6. Scan the QR code with the Expo Go app on your mobile device

## Firebase Setup

This app uses Firebase for authentication, Firestore database, and Realtime Database. You need to:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore Database
4. Create a Realtime Database
5. Update the Firebase configuration in `app.json`

## Project Structure

- `/src/firebase`: Firebase configuration
- `/src/contexts`: React contexts for state management
- `/src/screens`: App screens
- `/src/components`: Reusable UI components
- `/src/services`: Services for API calls and data handling
- `/src/utils`: Utility functions

## Technologies Used

- React Native
- Expo
- Firebase (Authentication, Firestore, Realtime Database)
- React Navigation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Inspired by the web version of ShitApp
- Uses the same Firebase backend as the web version 