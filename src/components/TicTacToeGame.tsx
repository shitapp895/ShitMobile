import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Game } from '../services/database/gameService';

interface TicTacToeGameProps {
  game: Game;
  onMove: (position: number) => void;
  disabled: boolean;
}

const TicTacToeGame: React.FC<TicTacToeGameProps> = ({ game, onMove, disabled }) => {
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

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 16,
  },
  cell: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1.5%',
    borderRadius: 8,
  },
  cellText: {
    fontSize: 36,
  },
});

export default TicTacToeGame; 