import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Game, subscribeToGame, makeMove, abandonGame } from '../services/database/gameService';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { SafeAreaView } from 'react-native-safe-area-context';

// Game Components
const TicTacToeGame: React.FC<{
  game: Game;
  onMove: (position: number) => void;
  disabled: boolean;
}> = ({ game, onMove, disabled }) => {
  if (game.type !== 'tictactoe') return null;

  const isFirstPlayer = (cellValue: string | null) => cellValue === game.players[0];

  return (
    <View style={styles.board}>
      {game.board.map((cell, index) => (
        <TouchableOpacity
          key={index}
          style={styles.cell}
          onPress={() => onMove(index)}
          disabled={cell !== null || disabled}
        >
          <Text style={styles.cellText}>
            {cell === null ? '' : isFirstPlayer(cell) ? '💩' : '🧻'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const RPSGame: React.FC<{
  game: Game;
  onMove: (choice: 'poop' | 'toilet_paper' | 'plunger') => void;
  disabled: boolean;
  userId: string;
}> = ({ game, onMove, disabled, userId }) => {
  if (game.type !== 'rps') return null;

  const choices = [
    { id: 'poop', emoji: '💩', label: 'Poop' },
    { id: 'toilet_paper', emoji: '🧻', label: 'Toilet Paper' },
    { id: 'plunger', emoji: '🔧', label: 'Plunger' }
  ];

  const playerChoice = game.choices[userId];
  const bothChose = game.players.every(p => game.choices[p] !== null);
  const opponentChoice = bothChose ? game.choices[game.players.find(p => p !== userId)!] : null;

  return (
    <View style={styles.rpsContainer}>
      {choices.map((choice) => {
        const isSelected = playerChoice === choice.id;
        const isDisabled = disabled || playerChoice !== null;
        const showOpponentChoice = bothChose && opponentChoice === choice.id;

        return (
          <TouchableOpacity
            key={choice.id}
            style={[
              styles.rpsButton,
              isSelected && styles.rpsButtonSelected,
              showOpponentChoice && styles.rpsButtonOpponent
            ]}
            onPress={() => onMove(choice.id as any)}
            disabled={isDisabled}
          >
            <Text style={styles.rpsEmoji}>{choice.emoji}</Text>
            <Text style={styles.rpsLabel}>{choice.label}</Text>
            {showOpponentChoice && (
              <Text style={styles.rpsOpponentLabel}>Opponent's Choice</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const WordleGame: React.FC<{
  game: Game;
  onMove: (guess: string) => void;
  disabled: boolean;
}> = ({ game, onMove, disabled }) => {
  if (game.type !== 'wordle') return null;

  return (
    <View style={styles.wordleContainer}>
      {/* TODO: Implement Wordle UI */}
      <Text style={styles.placeholderText}>Wordle Coming Soon</Text>
    </View>
  );
};

const HangmanGame: React.FC<{
  game: Game;
  onMove: (letter: string) => void;
  disabled: boolean;
}> = ({ game, onMove, disabled }) => {
  if (game.type !== 'hangman') return null;

  return (
    <View style={styles.hangmanContainer}>
      {/* TODO: Implement Hangman UI */}
      <Text style={styles.placeholderText}>Hangman Coming Soon</Text>
    </View>
  );
};

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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.quitButton}
            onPress={handleQuitGame}
          >
            <Text style={styles.quitButtonText}>Quit Game</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>
          {gameType === 'tictactoe' ? 'Tic Tac Toe' :
           gameType === 'rps' ? 'Rock Paper Scissors' :
           gameType === 'wordle' ? 'Toilet Wordle' :
           'Hangman'}
        </Text>
        <Text style={styles.subtitle}>Playing against {opponentName}</Text>
        {game.type !== 'rps' && (
          <Text style={styles.turnIndicator}>
            {game.currentTurn === userData?.uid ? "Your turn" : `${opponentName}'s turn`}
          </Text>
        )}
      </View>

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
          onMove={handleMove}
          disabled={isDisabled}
        />
      )}
      {game.type === 'hangman' && (
        <HangmanGame
          game={game}
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
  wordleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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