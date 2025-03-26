import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Game } from '../services/database/gameService';

interface RPSGameProps {
  game: Game;
  onMove: (choice: 'poop' | 'toilet_paper' | 'plunger') => void;
  disabled: boolean;
  userId: string;
}

const RPSGame: React.FC<RPSGameProps> = ({ game, onMove, disabled, userId }) => {
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

const styles = StyleSheet.create({
  rpsContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  rpsButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  rpsButtonSelected: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#ecfdf5',
  },
  rpsButtonOpponent: {
    borderColor: '#f59e0b',
    borderWidth: 2,
    backgroundColor: '#fffbeb',
  },
  rpsEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  rpsLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  rpsOpponentLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
});

export default RPSGame; 