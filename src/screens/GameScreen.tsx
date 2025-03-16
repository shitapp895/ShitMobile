import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Game, subscribeToGame, makeMove } from '../services/database/gameService';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

export default function GameScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userData } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  const { gameId, gameType } = route.params as { gameId: string; gameType: string };

  useEffect(() => {
    const setupGame = async () => {
      try {
        // Subscribe to game updates
        unsubscribeRef.current = subscribeToGame(gameId, (updatedGame) => {
          setGame(updatedGame);
          
          // If game is completed, show result
          if (updatedGame.status === 'completed') {
            let message = '';
            if (updatedGame.winner === 'draw') {
              message = "It's a draw!";
            } else if (updatedGame.winner === userData?.uid) {
              message = 'You won!';
            } else {
              message = 'You lost!';
            }
            Alert.alert('Game Over', message, [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ]);
          }
        });

        // Get opponent's name
        const gameDoc = await getDoc(doc(firestore, 'games', gameId));
        if (gameDoc.exists()) {
          const gameData = gameDoc.data();
          const opponentId = gameData.players.find((id: string) => id !== userData?.uid);
          if (opponentId) {
            const opponentDoc = await getDoc(doc(firestore, 'users', opponentId));
            if (opponentDoc.exists()) {
              setOpponentName(opponentDoc.data().displayName || 'Opponent');
            }
          }
        }
      } catch (error) {
        console.error('Error setting up game:', error);
        Alert.alert('Error', 'Failed to load game. Please try again.');
        navigation.goBack();
      }
    };

    setupGame();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [gameId, userData?.uid]);

  const handleMove = async (position: number) => {
    if (!game || game.status !== 'active' || game.currentTurn !== userData?.uid) {
      return;
    }

    try {
      await makeMove(gameId, userData.uid, position);
    } catch (error) {
      console.error('Error making move:', error);
      Alert.alert('Error', 'Failed to make move. Please try again.');
    }
  };

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tic Tac Toe</Text>
        <Text style={styles.subtitle}>Playing against {opponentName}</Text>
        <Text style={styles.turnIndicator}>
          {game.currentTurn === userData?.uid ? "Your turn" : `${opponentName}'s turn`}
        </Text>
      </View>

      <View style={styles.board}>
        {game.board.map((cell, index) => (
          <TouchableOpacity
            key={index}
            style={styles.cell}
            onPress={() => handleMove(index)}
            disabled={cell !== null || game.currentTurn !== userData?.uid}
          >
            <Text style={styles.cellText}>
              {cell === userData?.uid ? 'X' : cell === null ? '' : 'O'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 5,
  },
  turnIndicator: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '600',
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'center',
    width: 320,
    height: 320,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    width: 100,
    height: 100,
    backgroundColor: '#334155',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
  },
}); 