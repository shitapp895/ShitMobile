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
export type GameType = 'tictactoe' | 'rps' | 'wordle' | 'hangman';

export interface BaseGame {
  id?: string;
  type: GameType;
  players: string[];
  status: 'active' | 'completed' | 'abandoned';
  currentTurn: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  winner?: string;
}

export interface TicTacToeGame extends BaseGame {
  type: 'tictactoe';
  board: (string | null)[];
}

export interface RPSGame extends BaseGame {
  type: 'rps';
  choices: {
    [playerId: string]: 'poop' | 'toilet_paper' | 'plunger' | null;
  };
}

export interface WordleGame extends BaseGame {
  type: 'wordle';
  word: string;
  guesses: string[];
  maxGuesses: number;
}

export interface HangmanGame extends BaseGame {
  type: 'hangman';
  word: string;
  guessedLetters: string[];
  remainingGuesses: number;
  displayWord: string;
}

export type Game = TicTacToeGame | RPSGame | WordleGame | HangmanGame;

// Collection reference
const gamesCollection = collection(firestore, 'games');

// Convert Firebase document to Game
const convertGameDoc = (doc: QueryDocumentSnapshot<DocumentData>): Game => {
  const data = doc.data();
  const baseGame = {
    id: doc.id,
    type: data.type,
    players: data.players,
    status: data.status,
    currentTurn: data.currentTurn,
    createdAt: data.createdAt,
    lastUpdated: data.lastUpdated,
    winner: data.winner
  };

  switch (data.type) {
    case 'tictactoe':
      return {
        ...baseGame,
        type: 'tictactoe',
        board: data.board
      };
    case 'rps':
      return {
        ...baseGame,
        type: 'rps',
        choices: data.choices
      };
    case 'wordle':
      return {
        ...baseGame,
        type: 'wordle',
        word: data.word,
        guesses: data.guesses,
        maxGuesses: data.maxGuesses
      };
    case 'hangman':
      return {
        ...baseGame,
        type: 'hangman',
        word: data.word,
        guessedLetters: data.guessedLetters,
        remainingGuesses: data.remainingGuesses,
        displayWord: data.displayWord
      };
    default:
      throw new Error(`Unknown game type: ${data.type}`);
  }
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
export const makeMove = async (gameId: string, playerId: string, move: any): Promise<void> => {
  try {
    const gameRef = doc(firestore, 'games', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }
    
    const game = convertGameDoc(gameDoc);
    
    // Check if it's the player's turn (skip for RPS)
    if (game.type !== 'rps' && game.currentTurn !== playerId) {
      throw new Error('Not your turn');
    }

    let updates: any = {
      lastUpdated: Timestamp.now()
    };

    switch (game.type) {
      case 'tictactoe':
        // Check if the position is valid and empty
        if (move < 0 || move >= 9 || game.board[move] !== null) {
          throw new Error('Invalid move');
        }
        
        // Update the board
        const newBoard = [...game.board];
        newBoard[move] = playerId;
        updates.board = newBoard;
        updates.currentTurn = game.players.find(p => p !== playerId);
        
        // Check for winner
        const winner = checkWinner(newBoard, game.players);
        if (winner) {
          updates.status = 'completed';
          updates.winner = winner;
        }
        break;

      case 'rps':
        // Update player's choice without turn restriction
        updates.choices = {
          ...game.choices,
          [playerId]: move
        };

        // Check if both players have made their choices
        const bothChose = game.players.every(p => updates.choices[p] !== null);
        if (bothChose) {
          const winner = determineRPSWinner(updates.choices, game.players);
          updates.status = 'completed';
          updates.winner = winner;
        }
        break;

      case 'wordle':
        // Add the guess to the list
        updates.guesses = [...game.guesses, move];
        
        // Check if the guess is correct or if max guesses reached
        if (move === game.word || game.guesses.length + 1 >= game.maxGuesses) {
          updates.status = 'completed';
          updates.winner = move === game.word ? playerId : 'draw';
        }
        break;

      case 'hangman':
        // Add the letter to guessed letters
        updates.guessedLetters = [...game.guessedLetters, move];
        
        // Update the display word
        const newDisplayWord = updateDisplayWord(game.word, [...game.guessedLetters, move]);
        updates.displayWord = newDisplayWord;
        
        // Check if the word is complete or if no guesses left
        if (newDisplayWord === game.word || game.remainingGuesses <= 1) {
          updates.status = 'completed';
          updates.winner = newDisplayWord === game.word ? playerId : 'draw';
        } else {
          updates.remainingGuesses = game.remainingGuesses - 1;
        }
        break;
    }
    
    // Update the game
    await updateDoc(gameRef, updates);
  } catch (error) {
    console.error('Error making move:', error);
    throw error;
  }
};

// Helper function to determine RPS winner
const determineRPSWinner = (choices: { [key: string]: 'poop' | 'toilet_paper' | 'plunger' | null }, players: string[]): string | null => {
  const [player1, player2] = players;
  const choice1 = choices[player1];
  const choice2 = choices[player2];

  if (!choice1 || !choice2) {
    return null;
  }

  if (choice1 === choice2) {
    return 'draw';
  }

  if (
    (choice1 === 'poop' && choice2 === 'toilet_paper') ||
    (choice1 === 'toilet_paper' && choice2 === 'plunger') ||
    (choice1 === 'plunger' && choice2 === 'poop')
  ) {
    return player1;
  }

  return player2;
};

// Helper function to update Hangman display word
const updateDisplayWord = (word: string, guessedLetters: string[]): string => {
  return word
    .split('')
    .map(letter => guessedLetters.includes(letter) ? letter : '_')
    .join('');
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