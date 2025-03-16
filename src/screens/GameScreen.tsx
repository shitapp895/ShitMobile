import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  const handleQuitGame = () => {
    navigation.goBack();
  };

  useEffect(() => {
    const setupGame = async () => {
      try {
        // Subscribe to game updates
        unsubscribeRef.current = subscribeToGame(gameId, (updatedGame) => {
          setGame(updatedGame);
        });

        // Get opponent's name
        console.log('Fetching opponent name for game:', gameId);
        const gameDoc = await getDoc(doc(firestore, 'games', gameId));
        if (gameDoc.exists()) {
          const gameData = gameDoc.data();
          console.log('Game data:', gameData);
          const opponentId = gameData.players.find((id: string) => id !== userData?.uid);
          console.log('Found opponent ID:', opponentId);
          
          if (opponentId) {
            const opponentDoc = await getDoc(doc(firestore, 'users', opponentId));
            if (opponentDoc.exists()) {
              const opponentData = opponentDoc.data();
              console.log('Opponent data:', opponentData);
              setOpponentName(opponentData.displayName || 'Opponent');
            } else {
              console.log('Opponent document not found');
              setOpponentName('Opponent');
            }
          } else {
            console.log('No opponent ID found in game data');
            setOpponentName('Opponent');
          }
        } else {
          console.log('Game document not found');
          setOpponentName('Opponent');
        }
      } catch (error) {
        console.error('Error setting up game:', error);
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
    }
  };

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  const getGameResult = () => {
    if (game.status !== 'completed') return null;
    
    if (game.winner === 'draw') {
      return {
        text: "It's a draw!",
        color: '#94a3b8'
      };
    } else if (game.winner === userData?.uid) {
      return {
        text: 'You won!',
        color: '#22c55e'
      };
    } else {
      return {
        text: 'You lost!',
        color: '#ef4444'
      };
    }
  };

  const gameResult = getGameResult();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.quitButton}
            onPress={handleQuitGame}
          >
            <Text style={styles.quitButtonText}>Quit Game</Text>
          </TouchableOpacity>
        </View>
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

      {gameResult && (
        <View style={styles.resultOverlay}>
          <Text style={[styles.resultText, { color: gameResult.color }]}>
            {gameResult.text}
          </Text>
          <TouchableOpacity 
            style={styles.playAgainButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.playAgainButtonText}>Back To Shitting</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  quitButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  quitButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
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
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  playAgainButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  playAgainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 