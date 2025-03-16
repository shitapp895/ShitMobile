import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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

  const playerGuesses = game.playerGuesses[userData?.uid || ''] || { guesses: [], results: [] };
  const opponentGuesses = game.playerGuesses[game.players.find(id => id !== userData?.uid) || ''] || { guesses: [], results: [] };
  const opponentName = game.players.find(id => id !== userData?.uid);

  const handleKeyPress = async (key: string) => {
    if (game.status !== 'active' || !userData) return;
    if (playerGuesses.guesses.length >= game.maxGuesses) return;

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
            <View key={`cell-${rowIndex}-${i}`} style={[styles.cell, { backgroundColor }]}>
              <Text style={styles.cellText}>
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
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];

    return (
      <View style={styles.keyboard}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keyboardRow}>
            {row.map((key) => {
              const isWide = key === 'ENTER' || key === '⌫';
              const keyStyle = [
                styles.key,
                isWide && styles.wideKey,
                currentGuess.length === 5 && key === 'ENTER' && { backgroundColor: '#538d4e' },
                key === '⌫' && currentGuess.length > 0 && { backgroundColor: '#538d4e' }
              ];

              return (
                <TouchableOpacity
                  key={key}
                  style={keyStyle}
                  onPress={() => handleKeyPress(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.keyText,
                    isWide && { fontSize: 14 }
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

  return (
    <View style={styles.container}>
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
          ]}>THEM ({opponentGuesses.guesses.length}/6)</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121213',
    paddingTop: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
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
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
  },
  gameBoard: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 2,
  },
  cell: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#3a3a3c',
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
  },
  cellText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  errorContainer: {
    backgroundColor: '#ff4040',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  error: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  keyboardContainer: {
    paddingBottom: 32,
    paddingHorizontal: 4,
    backgroundColor: '#121213',
    borderTopWidth: 1,
    borderTopColor: '#3a3a3c',
    paddingTop: 8,
  },
  keyboard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  key: {
    height: 52,
    margin: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#818384',
    paddingHorizontal: 4,
    minWidth: 30,
    flex: 1,
    maxWidth: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  wideKey: {
    minWidth: 60,
    flex: 1.5,
    maxWidth: 65,
    backgroundColor: '#666668',
  },
  keyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  quitButton: {
    display: 'none',
  },
  quitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WordleGame; 