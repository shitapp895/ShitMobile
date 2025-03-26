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
  
  // Place all hooks at the top, before any conditional returns
  useEffect(() => {
    if (!userData?.uid) return;
    
    const userId = userData.uid;
    const myRemainingLives = game.remainingLives?.[userId] ?? 6;
    const myFinished = game.finishedGuessing?.[userId] || false;
    
    // Auto-show word when game is over, but only if not on the game over screen
    if ((myRemainingLives <= 0 || myFinished) && game.status !== 'completed') {
      setShowWord(true);
    }
  }, [game.status, game.remainingLives, game.finishedGuessing, userData?.uid]);

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

  // Get player's word and guessed letters with null checks
  const myWord = game.words?.[userId] || '';
  const myGuessedLetters = game.guessedLetters?.[userId] || [];
  const myRemainingLives = game.remainingLives?.[userId] ?? 6;
  const myFinished = game.finishedGuessing?.[userId] || false;

  // Get opponent's stats with null checks
  const opponentGuessedLetters = game.guessedLetters?.[opponentId] || [];
  const opponentRemainingLives = game.remainingLives?.[opponentId] ?? 6;
  const opponentFinished = game.finishedGuessing?.[opponentId] || false;
  const opponentWord = game.words?.[opponentId] || '';

  // Display word with blanks for unguessed letters
  const getDisplayWord = (word: string, guessedLetters: string[]) => {
    if (!word) return '';
    return word.split('').map(letter => 
      guessedLetters.includes(letter) ? letter : '_'
    ).join(' ');
  };

  // Check if we've won or lost
  const getAllLettersGuessed = (word: string, guessedLetters: string[]) => {
    if (!word) return false;
    return [...new Set(word.split(''))].every(letter => guessedLetters.includes(letter));
  };

  const isMyTurn = game.currentTurn === userId;
  const myAllLettersGuessed = getAllLettersGuessed(myWord, myGuessedLetters);
  const myWordDisplay = getDisplayWord(myWord, myGuessedLetters);
  
  // Don't show the game over UI in the game component itself
  // since it will be shown in the GameScreen overlay
  const isGameOver = game.status === 'completed';
  
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
    if (!word) return 0;
    const uniqueLetters = [...new Set(word.split(''))];
    if (uniqueLetters.length === 0) return 0;
    const correctGuesses = guessedLetters.filter(letter => word.includes(letter));
    return Math.floor((correctGuesses.length / uniqueLetters.length) * 100);
  };

  const myProgress = calculateProgress(myWord, myGuessedLetters);
  const opponentProgress = calculateProgress(opponentWord, opponentGuessedLetters);

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
          Lives: {Array(Math.max(0, myRemainingLives)).fill('🧻').join(' ')}
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
          Lives: {Array(Math.max(0, opponentRemainingLives)).fill('🧻').join(' ')}
        </Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${opponentProgress}%` }]} />
          <Text style={styles.progressText}>{opponentProgress}%</Text>
        </View>
        
        <Text style={styles.statusText}>
          {opponentFinished 
            ? (myFinished 
                ? 'Game complete!'
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b5563',
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  keyboardContainer: {
    marginTop: 10,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  keyButton: {
    width: 30,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  keyButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  keyButtonCorrect: {
    backgroundColor: '#10b981',
  },
  keyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  keyTextDisabled: {
    color: '#9ca3af',
  },
  keyTextCorrect: {
    color: '#fff',
  },
});

export default HangmanGame; 