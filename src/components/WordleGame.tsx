import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, useWindowDimensions } from 'react-native';
import { WordleGame as WordleGameType } from '../services/database/gameService';
import { useAuth } from '../hooks/useAuth';
import { makeMove } from '../services/database/gameService';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  game: WordleGameType;
  onQuit: () => void;
}

const QWERTY_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

const WordleGame: React.FC<Props> = ({ game, onQuit }) => {
  const { userData } = useAuth();
  const [currentGuess, setCurrentGuess] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showingPlayerBoard, setShowingPlayerBoard] = useState(true);
  const { width, height } = useWindowDimensions();
  
  // Determine if device is larger (iPad or landscape)
  const isLargeDevice = width > 768;

  const userId = userData?.uid || '';
  const opponentId = game.players.find(id => id !== userId) || '';
  const playerGuesses = game.playerGuesses[userId] || { guesses: [], results: [] };
  const opponentGuesses = game.playerGuesses[opponentId] || { guesses: [], results: [] };
  
  // Check if it's the player's turn
  const isPlayerTurn = game.currentTurn === userId;
  
  // useEffect to switch to opponent's board automatically when they make a move
  useEffect(() => {
    if (!isPlayerTurn && game.status === 'active') {
      // Only switch if we're not already showing opponent's board
      if (showingPlayerBoard) {
        setShowingPlayerBoard(false);
      }
    } else if (isPlayerTurn && game.status === 'active') {
      // Switch back to player's board when it's their turn
      if (!showingPlayerBoard) {
        setShowingPlayerBoard(true);
      }
    }
  }, [game.currentTurn, game.status]);

  const handleKeyPress = async (key: string) => {
    if (game.status !== 'active' || !userData) return;
    if (playerGuesses.guesses.length >= game.maxGuesses) return;
    if (!isPlayerTurn) {
      setError("It's your opponent's turn");
      return;
    }

    setError(null);

    if (key === '⌫') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key === 'ENTER') {
      if (currentGuess.length !== 5) {
        setError('Word must be 5 letters');
        return;
      }

      try {
        await makeMove(game.id!, userData.uid, currentGuess);
        setCurrentGuess('');
      } catch (err) {
        setError((err as Error).message);
      }
    } else if (currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  };

  const renderGuessRow = (guess: string | null, result: { greens: number[], yellows: number[] } | null, isOpponent: boolean, rowIndex: number) => {
    const cells = Array(5).fill(null);
    const letters = guess?.split('') || [];

    return (
      <View key={`row-${rowIndex}`} style={styles.row}>
        {cells.map((_, i) => {
          const letter = letters[i] || '';
          let backgroundColor = '#3a3a3c';
          
          if (letter) {
            if (isOpponent) {
              // For opponent, only show colors, not letters
              if (result?.greens.includes(i)) {
                backgroundColor = '#538d4e';
              } else if (result?.yellows.includes(i)) {
                backgroundColor = '#b59f3b';
              }
            } else {
              // For player, show both colors and letters
              if (result?.greens.includes(i)) {
                backgroundColor = '#538d4e';
              } else if (result?.yellows.includes(i)) {
                backgroundColor = '#b59f3b';
              }
            }
          }

          return (
            <View key={`cell-${rowIndex}-${i}`} style={[
              styles.cell, 
              { backgroundColor },
              isLargeDevice && styles.cellLarge
            ]}>
              <Text style={[
                styles.cellText,
                isLargeDevice && styles.cellTextLarge
              ]}>
                {!isOpponent ? letter : ''}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderCurrentGuess = (currentGuessIndex: number) => {
    return renderGuessRow(currentGuess, null, false, currentGuessIndex);
  };

  const renderEmptyRow = (index: number) => {
    return renderGuessRow(null, null, false, index);
  };

  const renderKeyboard = () => {
    return (
      <View style={styles.keyboard}>
        {QWERTY_LAYOUT.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyboardRow}>
            {row.map((key) => {
              const isWide = key === 'ENTER' || key === '⌫';
              const isDisabled = !isPlayerTurn || game.status !== 'active';
              
              // Customize key colors based on state
              let keyBgColor = '#3a3a3c';
              if (isDisabled) {
                keyBgColor = '#242425';
              } else if (key === 'ENTER' && currentGuess.length === 5) {
                keyBgColor = '#538d4e';
              } else if (key === '⌫' && currentGuess.length > 0) {
                keyBgColor = '#538d4e';
              }
              
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    isWide && styles.wideKey,
                    isLargeDevice && styles.keyLarge,
                    isWide && isLargeDevice && styles.wideKeyLarge,
                    { backgroundColor: keyBgColor }
                  ]}
                  onPress={() => handleKeyPress(key)}
                  activeOpacity={0.7}
                  disabled={isDisabled}
                >
                  <Text style={[
                    styles.keyText,
                    isWide && { fontSize: 14 },
                    isLargeDevice && styles.keyTextLarge,
                    isDisabled && { opacity: 0.5 }
                  ]}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderGameBoard = (guesses: string[], results: { greens: number[], yellows: number[] }[], isOpponent: boolean) => {
    const totalRows = game.maxGuesses;
    const currentGuessIndex = guesses.length;
    const rows = [];

    // Add empty rows at the top
    for (let i = 0; i < totalRows - currentGuessIndex - 1; i++) {
      rows.push(renderEmptyRow(i));
    }

    // Add current guess row if not complete
    if (!isOpponent && currentGuessIndex < totalRows) {
      rows.push(renderCurrentGuess(totalRows - currentGuessIndex - 1));
    }

    // Add completed guesses from bottom up
    for (let i = currentGuessIndex - 1; i >= 0; i--) {
      rows.push(renderGuessRow(guesses[i], results[i], isOpponent, totalRows - i - 1));
    }

    return rows.reverse();
  };

  const renderGameStatus = () => {
    if (game.status === 'completed') {
      return (
        <View style={styles.gameStatusContainer}>
          <Text style={styles.gameStatusText}>
            {game.winner === userId ? "You won!" : 
             game.winner === 'draw' ? "It's a draw!" : 
             "You lost!"}
          </Text>
          {game.winner !== 'draw' && (
            <Text style={styles.wordReveal}>
              The word was: <Text style={styles.wordRevealHighlight}>{game.word}</Text>
            </Text>
          )}
        </View>
      );
    }
    
    if (game.status === 'active') {
      return (
        <View style={styles.turnIndicatorContainer}>
          <View style={[
            styles.turnIndicator, 
            isPlayerTurn ? styles.playerTurn : styles.opponentTurn
          ]}>
            <Text style={styles.turnIndicatorText}>
              {isPlayerTurn ? "Your turn" : "Opponent's turn"}
            </Text>
          </View>
        </View>
      );
    }
    
    return null;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderGameStatus()}
      
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            showingPlayerBoard && styles.toggleButtonActive
          ]}
          onPress={() => setShowingPlayerBoard(true)}
        >
          <Text style={[
            styles.toggleText,
            showingPlayerBoard && styles.toggleTextActive
          ]}>YOU ({playerGuesses.guesses.length}/6)</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            !showingPlayerBoard && styles.toggleButtonActive
          ]}
          onPress={() => setShowingPlayerBoard(false)}
        >
          <Text style={[
            styles.toggleText,
            !showingPlayerBoard && styles.toggleTextActive
          ]}>OPPONENT ({opponentGuesses.guesses.length}/6)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.boardContainer}>
        {showingPlayerBoard ? (
          <View style={styles.gameBoard}>
            {renderGameBoard(playerGuesses.guesses, playerGuesses.results, false)}
          </View>
        ) : (
          <View style={styles.gameBoard}>
            {renderGameBoard(opponentGuesses.guesses, opponentGuesses.results, true)}
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      <View style={styles.keyboardContainer}>
        {renderKeyboard()}
      </View>

      <TouchableOpacity style={styles.quitButton} onPress={onQuit}>
        <Text style={styles.quitButtonText}>Quit Game</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121213',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  gameStatusContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#2a2a2b',
    borderRadius: 8,
  },
  gameStatusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  wordReveal: {
    fontSize: 16,
    color: '#d1d1d1',
  },
  wordRevealHighlight: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
  turnIndicatorContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  turnIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  playerTurn: {
    backgroundColor: '#538d4e',
  },
  opponentTurn: {
    backgroundColor: '#b59f3b',
  },
  turnIndicatorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1b',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3c',
  },
  toggleButtonActive: {
    backgroundColor: '#2a2a2b',
    borderColor: '#6366f1',
  },
  toggleText: {
    color: '#818384',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  boardContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  gameBoard: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  cell: {
    width: 50,
    height: 50,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  cellLarge: {
    width: 60,
    height: 60,
  },
  cellText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  cellTextLarge: {
    fontSize: 28,
  },
  errorContainer: {
    backgroundColor: '#f87171',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  error: {
    color: '#fff',
    fontWeight: 'bold',
  },
  keyboardContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  keyboard: {
    alignItems: 'center',
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  key: {
    backgroundColor: '#3a3a3c',
    width: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 4,
  },
  keyLarge: {
    width: 40,
    height: 60,
  },
  wideKey: {
    width: 60,
  },
  wideKeyLarge: {
    width: 80,
  },
  keyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  keyTextLarge: {
    fontSize: 20,
  },
  quitButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  quitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default WordleGame; 