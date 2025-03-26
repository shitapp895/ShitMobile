import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Game, subscribeToGame, makeMove, abandonGame } from '../services/database/gameService';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import WordleGame from '../components/WordleGame';
import TicTacToeGame from '../components/TicTacToeGame';
import RPSGame from '../components/RPSGame';
import HangmanGame from '../components/HangmanGame';

export default function GameScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userData } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  const { gameId, gameType } = route.params as { gameId: string; gameType: string };

  const handleQuitGame = () => {
    Alert.alert(
      'Quit Game',
      'Are you sure you want to quit?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => {
            // Navigate immediately
            navigation.goBack();
            // Update game status in the background
            abandonGame(gameId).catch(error => {
              console.error('Error abandoning game:', error);
            });
          }
        }
      ]
    );
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

  const handleMove = async (move: any) => {
    if (!game || game.status !== 'active' || !userData?.uid) {
      return;
    }

    try {
      await makeMove(gameId, userData.uid, move);
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
    if (game.status === 'completed') {
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
    } else if (game.status === 'abandoned') {
      return {
        text: 'Opponent quit the game',
        color: '#94a3b8'
      };
    }
    return null;
  };

  const gameResult = getGameResult();
  const isDisabled = game.status !== 'active' || (game.type !== 'rps' && game.currentTurn !== userData?.uid);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.gameTitle}>
            {gameType === 'tictactoe' ? 'Tic Tac Toe' :
             gameType === 'rps' ? 'Rock Paper Scissors' :
             gameType === 'wordle' ? 'Toilet Wordle' :
             gameType === 'hangman' ? 'Toilet Hangman' :
             'Game'}
          </Text>
          <Text style={styles.opponentName}>vs {opponentName}</Text>
          <TouchableOpacity 
            style={styles.quitButton}
            onPress={handleQuitGame}
          >
            <Text style={styles.quitButtonText}>Quit Game</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {game.type === 'tictactoe' && (
        <TicTacToeGame
          game={game}
          onMove={handleMove}
          disabled={isDisabled}
        />
      )}
      {game.type === 'rps' && userData?.uid && (
        <RPSGame
          game={game}
          onMove={handleMove}
          disabled={isDisabled}
          userId={userData.uid}
        />
      )}
      {game.type === 'wordle' && (
        <WordleGame
          game={game}
          onQuit={handleQuitGame}
        />
      )}
      {game.type === 'hangman' && (
        <HangmanGame
          game={game as any}
          onMove={handleMove}
          disabled={isDisabled}
        />
      )}

      {gameResult && (
        <SafeAreaView style={styles.resultOverlay}>
          <View style={styles.resultContent}>
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
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  header: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  gameTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  opponentName: {
    color: '#94a3b8',
    fontSize: 16,
    marginRight: 16,
  },
  quitButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  quitButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
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
  },
  resultContent: {
    flex: 1,
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
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: 320,
    height: 320,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -160 },
      { translateY: -160 }
    ],
  },
  cell: {
    width: 98,
    height: 98,
    backgroundColor: '#334155',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cellText: {
    fontSize: 48,
    color: '#fff',
  },
  rpsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    flexWrap: 'wrap',
    gap: 20,
  },
  rpsButton: {
    backgroundColor: '#334155',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    width: 120,
    opacity: 1,
  },
  rpsButtonSelected: {
    backgroundColor: '#6366f1',
  },
  rpsButtonOpponent: {
    backgroundColor: '#ef4444',
  },
  rpsEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  rpsLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rpsOpponentLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  hangmanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 18,
  },
}); 