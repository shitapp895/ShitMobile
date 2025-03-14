import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface GameCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export default function GamesScreen() {
  const { userData } = useAuth();
  
  // Sample game data
  const games: GameCard[] = [
    {
      id: 'tictactoe',
      title: 'Tic Tac Toe',
      description: 'Classic game with custom markers (💩 vs 🧻)',
      icon: 'grid',
      color: '#10b981',
    },
    {
      id: 'rps',
      title: 'Rock Paper Scissors',
      description: 'Themed choices: Poop, Toilet Paper, Plunger',
      icon: 'hand-right',
      color: '#6366f1',
    },
    {
      id: 'wordle',
      title: 'Toilet Wordle',
      description: 'Guess the bathroom-themed word in 6 tries',
      icon: 'text',
      color: '#f59e0b',
    },
    {
      id: 'hangman',
      title: 'Hangman',
      description: 'Guess the word before the toilet flushes',
      icon: 'man',
      color: '#ef4444',
    },
  ];
  
  // Render a game card
  const renderGameCard = (game: GameCard) => (
    <TouchableOpacity 
      key={game.id}
      style={styles.gameCard}
      onPress={() => console.log(`Starting game: ${game.title}`)}
    >
      <View style={[styles.gameIconContainer, { backgroundColor: game.color }]}>
        <Ionicons name={game.icon as any} size={32} color="#fff" />
      </View>
      
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle}>{game.title}</Text>
        <Text style={styles.gameDescription}>{game.description}</Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Games</Text>
        <Text style={styles.subtitle}>Play while you poop</Text>
      </View>
      
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Games Played</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Achievements</Text>
        </View>
      </View>
      
      <View style={styles.gamesSection}>
        <Text style={styles.sectionTitle}>Available Games</Text>
        {games.map(renderGameCard)}
      </View>
      
      <View style={styles.invitesSection}>
        <Text style={styles.sectionTitle}>Game Invites</Text>
        
        <View style={styles.emptyInvites}>
          <Ionicons name="game-controller" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No game invites</Text>
          <Text style={styles.emptySubtext}>Invite friends to play with you!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e5e7eb',
  },
  gamesSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f2937',
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  gameDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  invitesSection: {
    padding: 15,
    paddingBottom: 30,
  },
  emptyInvites: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 5,
  },
}); 