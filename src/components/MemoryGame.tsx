import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Game } from '../services/database/gameService';
import { useAuth } from '../hooks/useAuth';

interface MemoryGameProps {
  game: Game;
  onMove: (cardIndex: number) => void;
  disabled: boolean;
}

// Poop-themed emoji pairs for the memory game - reduced for 4x4 grid (8 pairs)
const CARD_EMOJIS = [
  '💩', '🧻', '🚽', '🧼', '🧴', '🚿', '🛁', '🪠'
];

const MemoryGame: React.FC<MemoryGameProps> = ({ game, onMove, disabled }) => {
  const { userData } = useAuth();
  const [cardRotations] = useState(Array(16).fill(0).map(() => new Animated.Value(0)));
  
  if (game.type !== 'memory') return null;
  
  // Ensure all required properties exist
  if (!game.cards || !game.players) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading game data...</Text>
      </View>
    );
  }
  
  const userId = userData?.uid || '';
  const isMyTurn = game.currentTurn === userId;
  const myScore = game.scores?.[userId] || 0;
  const opponentId = game.players.find(id => id !== userId) || '';
  const opponentScore = game.scores?.[opponentId] || 0;
  const isGameLocked = game.locked || false;
  
  // Check if card is matched (permanently revealed)
  const isCardMatched = (index: number) => (game.matchedPairs || []).includes(index);
  
  // Check if card is currently selected/flipped
  const isCardFlipped = (index: number) => {
    return (game.flippedCards || []).includes(index) || isCardMatched(index);
  };
  
  // Get emoji for a specific card
  const getCardEmoji = (index: number) => {
    if (!game.cards || index >= game.cards.length) return '';
    return game.cards[index] || '';
  };
  
  // Handle card press
  const handleCardPress = (index: number) => {
    if (disabled || !isMyTurn || isCardFlipped(index) || isGameLocked) return;
    onMove(index);
  };
  
  // Update animations when flipped cards change
  useEffect(() => {
    // Update all card animations
    for (let i = 0; i < 16; i++) {
      if (isCardFlipped(i)) {
        // Flip card to reveal
        Animated.spring(cardRotations[i], {
          toValue: 1,
          friction: 8,
          tension: 10,
          useNativeDriver: true,
        }).start();
      } else {
        // Flip card to hide
        Animated.timing(cardRotations[i], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [game.flippedCards, game.matchedPairs]);
  
  // Interpolate rotation for 3D flip effect
  const getCardTransform = (index: number) => {
    const frontRotation = cardRotations[index].interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    
    const backRotation = cardRotations[index].interpolate({
      inputRange: [0, 1],
      outputRange: ['180deg', '360deg'],
    });
    
    return {
      frontTransform: [{ rotateY: frontRotation }],
      backTransform: [{ rotateY: backRotation }],
    };
  };
  
  return (
    <View style={styles.container}>
      {/* Scoreboard */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>You</Text>
          <Text style={styles.scoreValue}>{myScore}</Text>
        </View>
        
        <View style={styles.turnIndicator}>
          <Text style={[
            styles.turnText,
            isGameLocked && styles.lockedText
          ]}>
            {isGameLocked ? "Memorize these cards!" : isMyTurn ? "Your turn" : "Opponent's turn"}
          </Text>
        </View>
        
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Opponent</Text>
          <Text style={styles.scoreValue}>{opponentScore}</Text>
        </View>
      </View>
      
      {/* Game Board - 4x4 grid */}
      <View style={styles.board}>
        {Array(16).fill(0).map((_, index) => {
          const { frontTransform, backTransform } = getCardTransform(index);
          const isCurrentlyRevealed = (game.flippedCards || []).includes(index);
          const isCurrentlyMatched = isCardMatched(index);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.cardContainer,
                isCurrentlyRevealed && isGameLocked && styles.cardHighlighted
              ]}
              onPress={() => handleCardPress(index)}
              disabled={disabled || !isMyTurn || isCardFlipped(index) || isGameLocked}
            >
              {/* Card Front (Hidden) */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardFront,
                  { transform: frontTransform }
                ]}
              >
                <Text style={styles.cardQuestionMark}>?</Text>
              </Animated.View>
              
              {/* Card Back (Emoji) */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardBack,
                  isCurrentlyMatched && styles.cardMatched,
                  { transform: backTransform }
                ]}
              >
                <Text style={styles.cardEmoji}>{getCardEmoji(index)}</Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Game Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {game.status === 'completed' 
            ? `Game Over! ${game.winner === userId ? 'You won!' : game.winner === 'draw' ? "It's a draw!" : 'Opponent won!'}`
            : isGameLocked 
              ? "👀 Remember these cards before they flip back! 👀" 
              : `Find matching pairs of cards. ${isMyTurn ? 'Your turn to flip a card!' : 'Wait for your turn.'}`
          }
        </Text>
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
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  turnIndicator: {
    flex: 1,
    alignItems: 'center',
  },
  turnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
  },
  lockedText: {
    color: '#f59e0b',
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: '22%', // Adjusted for 4x4 grid
    aspectRatio: 1,
    margin: '1.5%',
    perspective: 1000,
  },
  cardHighlighted: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#f59e0b',
    zIndex: 10,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardFront: {
    backgroundColor: '#6366f1',
  },
  cardBack: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  cardMatched: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  cardQuestionMark: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardEmoji: {
    fontSize: 24, // Increased size for better visibility
  },
  statusContainer: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4b5563',
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4b5563',
  },
});

export default MemoryGame; 