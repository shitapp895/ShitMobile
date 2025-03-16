import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { WordleGame as WordleGameType } from '../services/database/gameService';
import { useAuth } from '../hooks/useAuth';
import { makeMove } from '../services/database/gameService';

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

  const playerGuesses = game.playerGuesses[userData?.uid || ''] || { guesses: [], results: [] };
  const opponentGuesses = game.playerGuesses[game.players.find(id => id !== userData?.uid) || ''] || { guesses: [], results: [] };

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
    return (
      <View style={styles.keyboard}>
        {QWERTY_LAYOUT.map((row, i) => (
          <View key={`row-${i}`} style={styles.keyboardRow}>
            {row.map(key => (
              <TouchableOpacity
                key={`key-${key}`}
                style={[
                  styles.key,
                  key === 'ENTER' && styles.wideKey,
                  game.status !== 'active' && styles.disabledKey
                ]}
                onPress={() => handleKeyPress(key)}
                disabled={game.status !== 'active'}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.gameBoard}>
        <Text style={styles.label}>Your Guesses:</Text>
        {playerGuesses.guesses.map((guess, i) => 
          renderGuessRow(guess, playerGuesses.results[i], false, i)
        )}
        {playerGuesses.guesses.length < game.maxGuesses && 
          renderCurrentGuess(playerGuesses.guesses.length)
        }
        {Array(game.maxGuesses - playerGuesses.guesses.length - 1)
          .fill(null)
          .map((_, i) => renderEmptyRow(playerGuesses.guesses.length + i + 1))}

        <Text style={[styles.label, styles.opponentLabel]}>Opponent's Guesses:</Text>
        {opponentGuesses.guesses.map((guess, i) => 
          renderGuessRow(guess, opponentGuesses.results[i], true, i + game.maxGuesses)
        )}
        {Array(game.maxGuesses - opponentGuesses.guesses.length)
          .fill(null)
          .map((_, i) => renderEmptyRow(i + game.maxGuesses + opponentGuesses.guesses.length))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {renderKeyboard()}

      <TouchableOpacity style={styles.quitButton} onPress={onQuit}>
        <Text style={styles.quitButtonText}>Quit Game</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121213',
    padding: 10,
  },
  gameBoard: {
    flex: 1,
    width: '100%',
    maxWidth: 350,
    marginBottom: 20,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  opponentLabel: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
  },
  cell: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#3a3a3c',
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  keyboard: {
    width: '100%',
    maxWidth: 500,
    marginTop: 'auto',
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  key: {
    backgroundColor: '#818384',
    borderRadius: 4,
    minWidth: 30,
    height: 58,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  wideKey: {
    minWidth: 65,
  },
  disabledKey: {
    opacity: 0.5,
  },
  keyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  error: {
    color: '#ff4040',
    marginBottom: 10,
    textAlign: 'center',
  },
  quitButton: {
    backgroundColor: '#ff4040',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  quitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WordleGame; 