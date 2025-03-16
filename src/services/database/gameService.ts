import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  updateDoc,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { firestore } from '../../firebase/config';

// Types
export interface Game {
  id?: string;
  type: 'tictactoe';
  players: string[];
  status: 'active' | 'completed' | 'abandoned';
  currentTurn: string;
  board: (string | null)[];
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  winner?: string;
}

// Collection reference
const gamesCollection = collection(firestore, 'games');

// Convert Firebase document to Game
const convertGameDoc = (doc: QueryDocumentSnapshot<DocumentData>): Game => {
  const data = doc.data();
  return {
    id: doc.id,
    type: data.type,
    players: data.players,
    status: data.status,
    currentTurn: data.currentTurn,
    board: data.board,
    createdAt: data.createdAt,
    lastUpdated: data.lastUpdated,
    winner: data.winner
  };
};

// Create a new game
export const createGame = async (gameData: Omit<Game, 'id'>): Promise<string> => {
  try {
    const gameRef = doc(collection(firestore, 'games'));
    await setDoc(gameRef, gameData);
    return gameRef.id;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

// Get a game by ID
export const getGame = async (gameId: string): Promise<Game | null> => {
  try {
    const gameRef = doc(firestore, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      return null;
    }
    
    return convertGameDoc(gameDoc);
  } catch (error) {
    console.error('Error getting game:', error);
    throw error;
  }
};

// Make a move in the game
export const makeMove = async (gameId: string, playerId: string, position: number): Promise<void> => {
  try {
    const gameRef = doc(firestore, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }
    
    const game = convertGameDoc(gameDoc);
    
    // Check if it's the player's turn
    if (game.currentTurn !== playerId) {
      throw new Error('Not your turn');
    }
    
    // Check if the position is valid and empty
    if (position < 0 || position >= 9 || game.board[position] !== null) {
      throw new Error('Invalid move');
    }
    
    // Update the board
    const newBoard = [...game.board];
    newBoard[position] = playerId;
    
    // Check for winner
    const winner = checkWinner(newBoard, game.players);
    
    // Update the game
    await updateDoc(gameRef, {
      board: newBoard,
      currentTurn: game.players.find(p => p !== playerId),
      lastUpdated: Timestamp.now(),
      ...(winner && { status: 'completed', winner })
    });
  } catch (error) {
    console.error('Error making move:', error);
    throw error;
  }
};

// Subscribe to game updates
export const subscribeToGame = (
  gameId: string,
  onGameUpdate: (game: Game) => void
): () => void => {
  const gameRef = doc(firestore, 'games', gameId);
  
  const unsubscribe = onSnapshot(gameRef, (doc) => {
    if (doc.exists()) {
      onGameUpdate(convertGameDoc(doc));
    }
  });
  
  return unsubscribe;
};

// Helper function to check for winner
const checkWinner = (board: (string | null)[], players: string[]): string | null => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];
  
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  
  // Check for draw
  if (!board.includes(null)) {
    return 'draw';
  }
  
  return null;
};

// Abandon a game
export const abandonGame = async (gameId: string): Promise<void> => {
  try {
    const gameRef = doc(firestore, 'games', gameId);
    await updateDoc(gameRef, {
      status: 'abandoned',
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error('Error abandoning game:', error);
    throw error;
  }
}; 