import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HangmanGame as HangmanGameType } from '../services/database/gameService';
import { useAuth } from '../hooks/useAuth';

interface HangmanGameProps {
  game: HangmanGameType;
  onMove: (letter: string) => void;
  disabled: boolean;
}

// Create keyboard rows
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const HangmanGame: React.FC<HangmanGameProps> = ({ game, onMove, disabled }) => {
  const { userData } = useAuth();
  const [showWord, setShowWord] = useState(false);

  if (!userData?.uid) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: User not authenticated</Text>
      </View>
    );
  }

  const userId = userData.uid;
  const opponentId = game.players.find(id => id !== userId);
  
  // If no opponent, something is wrong
  if (!opponentId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: No opponent found</Text>
      </View>
    );
  }

  // Get player's word and guessed letters
  const myWord = game.words[userId];
  const myGuessedLetters = game.guessedLetters[userId] || [];
  const myRemainingLives = game.remainingLives[userId];
  const myFinished = game.finishedGuessing[userId];

  // Get opponent's stats
  const opponentGuessedLetters = game.guessedLetters[opponentId] || [];
  const opponentRemainingLives = game.remainingLives[opponentId];
  const opponentFinished = game.finishedGuessing[opponentId];

  // Display word with blanks for unguessed letters
  const getDisplayWord = (word: string, guessedLetters: string[]) => {
    return word.split('').map(letter => 
      guessedLetters.includes(letter) ? letter : '_'
    ).join(' ');
  };

  // Check if we've won or lost
  const getAllLettersGuessed = (word: string, guessedLetters: string[]) => {
    return [...new Set(word.split(''))].every(letter => guessedLetters.includes(letter));
  };

  const isMyTurn = game.currentTurn === userId;
  const myAllLettersGuessed = getAllLettersGuessed(myWord, myGuessedLetters);
  const myWordDisplay = getDisplayWord(myWord, myGuessedLetters);
  
  const handleLetterPress = (letter: string) => {
    if (!isMyTurn || disabled || myGuessedLetters.includes(letter) || myFinished) {
      return;
    }
    onMove(letter);
  };

  // Toggle showing the actual word
  const toggleShowWord = () => {
    if (myFinished || game.status !== 'active') {
      setShowWord(!showWord);
    } else {
      Alert.alert('Cannot reveal word', 'You can only see your word after the game is finished.');
    }
  };

  // Calculate progress percentage for both players
  const calculateProgress = (word: string, guessedLetters: string[]) => {
    const uniqueLetters = [...new Set(word.split(''))];
    const correctGuesses = guessedLetters.filter(letter => word.includes(letter));
    return Math.floor((correctGuesses.length / uniqueLetters.length) * 100);
  };

  const myProgress = calculateProgress(myWord, myGuessedLetters);
  const opponentProgress = calculateProgress(game.words[opponentId], opponentGuessedLetters);

  return (
    <View style={styles.container}>
      {/* Game info */}
      <View style={styles.infoContainer}>
        <Text style={styles.turnText}>
          {game.status === 'active'
            ? isMyTurn
              ? "Your turn"
              : "Opponent's turn"
            : "Game over"}
        </Text>
      </View>
      
      {/* My word section */}
      <View style={styles.wordContainer}>
        <Text style={styles.wordLabel}>Your Word:</Text>
        <TouchableOpacity onPress={toggleShowWord} style={styles.wordDisplayContainer}>
          <Text style={styles.wordDisplay}>
            {showWord ? myWord : myWordDisplay}
          </Text>
          <Ionicons name={showWord ? "eye-off" : "eye"} size={20} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.livesText}>
          Lives: {Array(myRemainingLives).fill('🧻').join(' ')}
        </Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${myProgress}%` }]} />
          <Text style={styles.progressText}>{myProgress}%</Text>
        </View>
      </View>

      {/* Opponent's progress */}
      <View style={styles.opponentContainer}>
        <Text style={styles.opponentLabel}>Opponent's Progress:</Text>
        <Text style={styles.livesText}>
          Lives: {Array(opponentRemainingLives).fill('🧻').join(' ')}
        </Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${opponentProgress}%` }]} />
          <Text style={styles.progressText}>{opponentProgress}%</Text>
        </View>
        <Text style={styles.statusText}>
          {opponentFinished 
            ? (myFinished 
                ? `Final result: ${game.winner === userId ? 'You won!' : game.winner === 'draw' ? "It's a draw!" : 'You lost!'}`
                : 'Opponent has finished guessing')
            : 'Opponent is still guessing'}
        </Text>
      </View>

      {/* Virtual keyboard */}
      <View style={styles.keyboardContainer}>
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keyboardRow}>
            {row.map(letter => {
              const isGuessed = myGuessedLetters.includes(letter);
              const isCorrect = myWord.includes(letter) && isGuessed;
              
              return (
                <TouchableOpacity
                  key={letter}
                  style={[
                    styles.keyButton,
                    isGuessed && styles.keyButtonDisabled,
                    isCorrect && styles.keyButtonCorrect
                  ]}
                  onPress={() => handleLetterPress(letter)}
                  disabled={isGuessed || !isMyTurn || disabled || myFinished}
                >
                  <Text style={[
                    styles.keyText,
                    isGuessed && styles.keyTextDisabled,
                    isCorrect && styles.keyTextCorrect
                  ]}>
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  infoContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  turnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  wordContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  wordLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4b5563',
  },
  wordDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  wordDisplay: {
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  livesText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#4b5563',
  },
  progressContainer: {
    height: 20,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 10,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    top: 2,
  },
  opponentContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  opponentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4b5563',
  },
  statusText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  keyboardContainer: {
    marginTop: 16,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  keyButton: {
    width: 30,
    height: 40,
    backgroundColor: '#6366f1',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  keyButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  keyButtonCorrect: {
    backgroundColor: '#10b981',
  },
  keyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  keyTextDisabled: {
    color: '#9ca3af',
  },
  keyTextCorrect: {
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
});

export default HangmanGame; 