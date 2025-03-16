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
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>You</Text>
          <View style={styles.guessCount}>
            <Text style={styles.guessCountText}>{playerGuesses.guesses.length}/6</Text>
          </View>
        </View>
        <View style={styles.gameStatus}>
          <Text style={styles.gameTitle}>TOILET WORDLE</Text>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>Opponent</Text>
          <View style={styles.guessCount}>
            <Text style={styles.guessCountText}>{opponentGuesses.guesses.length}/6</Text>
          </View>
        </View>
      </View>

      <View style={styles.boardsContainer}>
        <View style={styles.gameBoard}>
          {playerGuesses.guesses.map((guess, i) => 
            renderGuessRow(guess, playerGuesses.results[i], false, i)
          )}
          {playerGuesses.guesses.length < game.maxGuesses && 
            renderCurrentGuess(playerGuesses.guesses.length)
          }
          {Array(game.maxGuesses - playerGuesses.guesses.length - 1)
            .fill(null)
            .map((_, i) => renderEmptyRow(playerGuesses.guesses.length + i + 1))}
        </View>

        <View style={styles.boardDivider}>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.gameBoard}>
          {opponentGuesses.guesses.map((guess, i) => 
            renderGuessRow(guess, opponentGuesses.results[i], true, i + game.maxGuesses)
          )}
          {Array(game.maxGuesses - opponentGuesses.guesses.length)
            .fill(null)
            .map((_, i) => renderEmptyRow(i + game.maxGuesses + opponentGuesses.guesses.length))}
        </View>
      </View>

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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
  },
  playerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  guessCount: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  guessCountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gameStatus: {
    flex: 2,
    alignItems: 'center',
  },
  gameTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  error: {
    color: '#ff4040',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  boardsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  gameBoard: {
    flex: 1,
    alignItems: 'center',
  },
  boardDivider: {
    width: 24,
    alignItems: 'center',
  },
  dividerLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#3a3a3c',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 2,
  },
  cell: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: '#3a3a3c',
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
  },
  cellText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  keyboardContainer: {
    paddingBottom: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3c',
  },
  keyboard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 500,
    paddingTop: 8,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  key: {
    backgroundColor: '#818384',
    borderRadius: 4,
    minWidth: 32,
    height: 48,
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  wideKey: {
    minWidth: 64,
  },
  disabledKey: {
    opacity: 0.5,
  },
  keyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
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