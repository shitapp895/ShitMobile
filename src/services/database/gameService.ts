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
import { getRandomWord } from './wordService';

// Types
export type GameType = 'tictactoe' | 'rps' | 'wordle' | 'hangman' | 'memory' | 'chess';

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
  playerGuesses: {
    [playerId: string]: {
      guesses: string[];
      results: {
        greens: number[];
        yellows: number[];
      }[];
    };
  };
  maxGuesses: number;
  finishTimes: {
    [playerId: string]: Timestamp | null;
  };
}

export interface HangmanGame extends BaseGame {
  type: 'hangman';
  words: {
    [playerId: string]: string;
  };
  guessedLetters: {
    [playerId: string]: string[];
  };
  remainingLives: {
    [playerId: string]: number;
  };
  finishedGuessing: {
    [playerId: string]: boolean;
  };
}

export interface MemoryGame extends BaseGame {
  type: 'memory';
  cards: string[];          // Array of emoji values on cards
  flippedCards: number[];   // Currently flipped cards (no match yet)
  matchedPairs: number[];   // Indices of cards that have been matched
  scores: {                 // Score for each player
    [playerId: string]: number;
  };
  lastFlip?: number;        // Index of the last flipped card
  locked?: boolean;         // Whether the game is locked during card reveal
}

export interface ChessGame extends BaseGame {
  type: 'chess';
  board: { [position: string]: string }; // Position as key (e.g. "0,0"), piece as value 
  captures: {
    [playerId: string]: string[]; // Captured pieces for each player
  };
  moves: string[]; // List of moves in standard notation
  timeRemaining: {
    [playerId: string]: number; // Time remaining in seconds for each player
  };
  lastMoveTime: Timestamp; // When the last move was made
}

export type Game = TicTacToeGame | RPSGame | WordleGame | HangmanGame | MemoryGame | ChessGame;

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
        playerGuesses: data.playerGuesses,
        maxGuesses: data.maxGuesses,
        finishTimes: data.finishTimes
      };
    case 'hangman':
      return {
        ...baseGame,
        type: 'hangman',
        words: data.words,
        guessedLetters: data.guessedLetters,
        remainingLives: data.remainingLives,
        finishedGuessing: data.finishedGuessing
      };
    case 'memory':
      return {
        ...baseGame,
        type: 'memory',
        cards: data.cards,
        flippedCards: data.flippedCards,
        matchedPairs: data.matchedPairs,
        scores: data.scores,
        lastFlip: data.lastFlip
      };
    case 'chess':
      return {
        ...baseGame,
        type: 'chess',
        board: data.board,
        captures: data.captures,
        moves: data.moves,
        timeRemaining: data.timeRemaining,
        lastMoveTime: data.lastMoveTime
      };
    default:
      throw new Error(`Unknown game type: ${data.type}`);
  }
};

// Create a new game
export const createGame = async (
  type: GameType,
  players: string[],
  data?: any
): Promise<string> => {
  const gameRef = doc(gamesCollection);
  const now = Timestamp.now();

  let gameData: any = {
    type,
    players,
    status: 'active',
    currentTurn: players[0],
    createdAt: now,
    lastUpdated: now
  };

  switch (type) {
    case 'tictactoe':
      gameData = {
        ...gameData,
        board: Array(9).fill(null)
      };
      break;
    case 'rps':
      gameData = {
        ...gameData,
        choices: players.reduce((acc, player) => ({
          ...acc,
          [player]: null
        }), {})
      };
      break;
    case 'wordle':
      gameData = {
        ...gameData,
        word: getRandomWord(),
        playerGuesses: players.reduce((acc, player) => ({
          ...acc,
          [player]: {
            guesses: [],
            results: []
          }
        }), {}),
        maxGuesses: 6,
        finishTimes: players.reduce((acc, player) => ({
          ...acc,
          [player]: null
        }), {})
      };
      break;
    case 'hangman':
      // Generate a word for each player
      const playerWords = {};
      for (const player of players) {
        playerWords[player] = getRandomWord();
      }
      
      gameData = {
        ...gameData,
        words: playerWords,
        guessedLetters: players.reduce((acc, player) => ({
          ...acc,
          [player]: []
        }), {}),
        remainingLives: players.reduce((acc, player) => ({
          ...acc,
          [player]: 6
        }), {}),
        finishedGuessing: players.reduce((acc, player) => ({
          ...acc,
          [player]: false
        }), {})
      };
      break;
    case 'memory':
      // Create pairs of emojis
      const emojis = ['💩', '🧻', '🚽', '🧼', '🧽', '🪠', '🧴', '🚿', '🛁', '🚪', '🪥', '🧫', '🦠', '🧪', '💊', '💉', '🩹', '🩺'];
      const pairs = [...emojis, ...emojis].slice(0, 36); // 18 pairs for 36 cards
      
      // Shuffle the pairs using Fisher-Yates algorithm
      for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
      }
      
      gameData = {
        ...gameData,
        cards: pairs,
        flippedCards: [],
        matchedPairs: [],
        scores: players.reduce((acc, player) => ({
          ...acc,
          [player]: 0
        }), {})
      };
      break;
    case 'chess':
      // Create initial chess board state
      const initialPieces = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
      ];
      
      // Convert to serialized format
      const serializedBoard = {};
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = initialPieces[row][col];
          if (piece) {
            serializedBoard[`${row},${col}`] = piece;
          }
        }
      }
      
      gameData = {
        ...gameData,
        board: serializedBoard,
        captures: players.reduce((acc, player) => ({
          ...acc,
          [player]: []
        }), {}),
        moves: [],
        timeRemaining: players.reduce((acc, player) => ({
          ...acc,
          [player]: 60 // 60 seconds = 1 minute per player
        }), {}),
        lastMoveTime: now
      };
      break;
  }

  await setDoc(gameRef, gameData);
  return gameRef.id;
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

    // SPECIAL CASE FOR HANGMAN - handle separately
    if (game.type === 'hangman') {
      const hangmanGame = game as HangmanGame;
      const letter = move.toUpperCase();
      
      // Check if letter is valid
      if (!/^[A-Z]$/.test(letter)) {
        throw new Error('Invalid letter');
      }
      
      // Get player's word and currently guessed letters
      const playerWord = hangmanGame.words?.[playerId];
      if (!playerWord) {
        throw new Error('Word not found for player');
      }
      
      const playerGuessedLetters = [...(hangmanGame.guessedLetters?.[playerId] || [])];
      
      // Check if letter was already guessed
      if (playerGuessedLetters.includes(letter)) {
        throw new Error('Letter already guessed');
      }
      
      // Add letter to guessed letters
      playerGuessedLetters.push(letter);
      
      // Prepare the updates
      const updates: any = {
        lastUpdated: Timestamp.now(),
        guessedLetters: {
          ...(hangmanGame.guessedLetters || {}),
          [playerId]: playerGuessedLetters
        }
      };
      
      // Check if letter is in the word
      if (!playerWord.includes(letter)) {
        // Decrease remaining lives
        const currentLives = hangmanGame.remainingLives?.[playerId] || 6;
        const newRemainingLives = currentLives - 1;
        updates.remainingLives = {
          ...(hangmanGame.remainingLives || {}),
          [playerId]: newRemainingLives
        };
      }
      
      // Get opponent ID
      const opponentId = game.players.find(p => p !== playerId);
      if (!opponentId) {
        throw new Error('Opponent not found');
      }
      
      // Check if player has completed their word
      const uniqueLettersInWord = [...new Set(playerWord.split(''))];
      const hasGuessedAllLetters = uniqueLettersInWord.every(l => playerGuessedLetters.includes(l));
      
      // Check if player has run out of lives
      const playerCurrentLives = updates.remainingLives?.[playerId] ?? hangmanGame.remainingLives?.[playerId] ?? 0;
      const hasRunOutOfLives = playerCurrentLives <= 0;
      
      // Mark player as finished if they've guessed all letters or run out of lives
      const playerJustFinished = (hasGuessedAllLetters || hasRunOutOfLives);
      if (playerJustFinished) {
        updates.finishedGuessing = {
          ...(hangmanGame.finishedGuessing || {}),
          [playerId]: true
        };
      }
      
      // Current status
      const playerNowFinished = playerJustFinished || hangmanGame.finishedGuessing?.[playerId] || false;
      const opponentFinished = hangmanGame.finishedGuessing?.[opponentId] || false;
      const opponentLives = hangmanGame.remainingLives?.[opponentId] ?? 0;
      
      // DECISION LOGIC FOR TURN AND GAME STATUS
      
      // CASE 1: Both players finished - game over
      if (playerNowFinished && opponentFinished) {
        updates.status = 'completed';
        
        if (playerCurrentLives > opponentLives) {
          updates.winner = playerId;
        } else if (opponentLives > playerCurrentLives) {
          updates.winner = opponentId;
        } else {
          updates.winner = 'draw';
        }
        
        await updateDoc(gameRef, updates);
        return; // EXIT FUNCTION
      }
      
      // CASE 2: Player just finished, opponent has lesser lives
      if (playerJustFinished && !opponentFinished && opponentLives < playerCurrentLives) {
        updates.status = 'completed';
        updates.winner = playerId;
        await updateDoc(gameRef, updates);
        return; // EXIT FUNCTION
      }
      
      // CASE 3: Player just finished, opponent has equal or more lives
      if (playerJustFinished && !opponentFinished && opponentLives >= playerCurrentLives) {
        updates.currentTurn = opponentId;
        await updateDoc(gameRef, updates);
        return; // EXIT FUNCTION
      }
      
      // CASE 4: Opponent already finished, player hasn't
      if (!playerNowFinished && opponentFinished) {
        // Player has fewer lives - opponent wins
        if (playerCurrentLives < opponentLives) {
          updates.status = 'completed';
          updates.winner = opponentId;
        } else {
          // CRITICAL: Keep turn with player - they still have a chance
          updates.currentTurn = playerId;
        }
        await updateDoc(gameRef, updates);
        return; // EXIT FUNCTION
      }
      
      // CASE 5: Neither finished - normal turn switch
      if (!playerNowFinished && !opponentFinished) {
        // Check if opponent has no lives - mark them as finished
        if (opponentLives <= 0) {
          updates.finishedGuessing = {
            ...(updates.finishedGuessing || {}),
            [opponentId]: true
          };
          // Keep turn with current player
          updates.currentTurn = playerId;
        } else {
          // Normal alternating turns
          updates.currentTurn = opponentId;
        }
        await updateDoc(gameRef, updates);
        return; // EXIT FUNCTION
      }
      
      // Failsafe - shouldn't get here but just in case
      await updateDoc(gameRef, updates);
      return; // EXIT FUNCTION
    }

    // SPECIAL CASE FOR MEMORY GAME
    if (game.type === 'memory') {
      const memoryGame = game as MemoryGame;
      const cardIndex = move as number;
      
      // Check if game is locked during card reveal
      if (memoryGame.locked) {
        throw new Error('Game is locked during card reveal');
      }
      
      // Validate move
      if (cardIndex < 0 || cardIndex >= memoryGame.cards.length) {
        throw new Error('Invalid card index');
      }
      
      // Ensure arrays are initialized
      const currentFlippedCards = memoryGame.flippedCards || [];
      const currentMatchedPairs = memoryGame.matchedPairs || [];
      
      // Check if the card is already flipped or matched
      if (currentFlippedCards.includes(cardIndex) || currentMatchedPairs.includes(cardIndex)) {
        throw new Error('Card already flipped or matched');
      }
      
      const updates: any = {
        lastUpdated: Timestamp.now()
      };
      
      // Add the card to flipped cards
      const newFlippedCards = [...currentFlippedCards, cardIndex];
      updates.flippedCards = newFlippedCards;
      updates.lastFlip = cardIndex;
      
      // Check if this is the second card flipped
      if (newFlippedCards.length === 2) {
        const [firstCard, secondCard] = newFlippedCards;
        
        // Check if cards match (have the same emoji)
        if (memoryGame.cards[firstCard] === memoryGame.cards[secondCard]) {
          // Match found! Add both cards to matchedPairs
          updates.matchedPairs = [...currentMatchedPairs, firstCard, secondCard];
          // Clear flipped cards
          updates.flippedCards = [];
          // Increment player's score
          updates.scores = {
            ...(memoryGame.scores || {}),
            [playerId]: (memoryGame.scores?.[playerId] || 0) + 1
          };
          
          // Player gets another turn for finding a match
          updates.currentTurn = playerId;
          
          // Check if all pairs have been found (game over)
          if ((currentMatchedPairs.length + 2) === memoryGame.cards.length) {
            updates.status = 'completed';
            
            // Determine winner based on scores
            const players = Object.keys(memoryGame.scores || {});
            const player1Score = memoryGame.scores?.[players[0]] || 0;
            const player2Score = memoryGame.scores?.[players[1]] || 0;
            
            if (player1Score > player2Score) {
              updates.winner = players[0];
            } else if (player2Score > player1Score) {
              updates.winner = players[1];
            } else {
              updates.winner = 'draw';
            }
          }
        } else {
          // No match - Lock the game during card reveal
          updates.locked = true;
          
          // Store the next player in a temporary field to use after the delay
          const otherPlayer = game.players.find(p => p !== playerId);
          if (otherPlayer) {
            updates.nextTurn = otherPlayer;
          }
          
          // Update the document with both cards flipped and game locked
          await updateDoc(gameRef, updates);
          
          // Use a timeout to flip the cards back and switch turns
          setTimeout(async () => {
            try {
              console.log('Memory game: Flipping cards back and switching turns');
              // Then update again to clear the flipped cards, unlock the game, and switch turns
              await updateDoc(gameRef, {
                flippedCards: [], // Important: Clear flipped cards to flip them back
                locked: false,
                currentTurn: updates.nextTurn || otherPlayer,
                nextTurn: null,
                lastUpdated: Timestamp.now()
              });
            } catch (error) {
              console.error('Error updating game after delay:', error);
              // Failsafe
              await updateDoc(gameRef, { 
                flippedCards: [], 
                locked: false,
                currentTurn: updates.nextTurn || otherPlayer
              });
            }
          }, 3000);
          
          return;
        }
      }
      
      await updateDoc(gameRef, updates);
      return;
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
        if (typeof move !== 'string' || move.length !== 5) {
          throw new Error('Invalid move: guess must be a 5-letter word');
        }

        const playerGuesses = game.playerGuesses[playerId] || { guesses: [], results: [] };
        if (playerGuesses.guesses.length >= game.maxGuesses) {
          throw new Error('No more guesses allowed');
        }

        const result = evaluateWordleGuess(move.toUpperCase(), game.word);
        
        updates.playerGuesses = {
          ...game.playerGuesses,
          [playerId]: {
            guesses: [...playerGuesses.guesses, move.toUpperCase()],
            results: [...playerGuesses.results, result]
          }
        };

        // Update finish time if this was the player's last guess or they found the word
        if (playerGuesses.guesses.length === game.maxGuesses - 1 || move.toUpperCase() === game.word) {
          updates.finishTimes = {
            ...game.finishTimes,
            [playerId]: Timestamp.now()
          };
        }

        // Check for winner
        const wordleWinner = determineWordleWinner(game as WordleGame);

        if (wordleWinner) {
          updates.status = 'completed';
          updates.winner = wordleWinner;
        }
        break;

      case 'chess': {
        // Make sure it's the player's turn
        if (game.currentTurn !== playerId) {
          throw new Error("Not your turn");
        }
        
        // Validate move structure
        if (!move || !move.from || !move.to) {
          throw new Error("Invalid move format");
        }
        
        // Calculate time used since last move
        const now = Timestamp.now();
        const lastMoveTime = game.lastMoveTime;
        const timeElapsed = (now.seconds - lastMoveTime.seconds);
        
        // Update time remaining
        const updatedTimeRemaining = { ...game.timeRemaining };
        updatedTimeRemaining[playerId] = Math.max(0, updatedTimeRemaining[playerId] - timeElapsed);
        
        // If player ran out of time, they lost
        if (updatedTimeRemaining[playerId] <= 0) {
          // Get opponent ID
          const opponentId = game.players.find(p => p !== playerId)!;
          
          const gameUpdate = {
            status: 'completed',
            winner: opponentId,
            timeRemaining: updatedTimeRemaining,
            lastUpdated: now
          };
          
          await updateDoc(gameRef, gameUpdate);
          return;
        }
        
        // Check if the move is valid
        const { from, to, capture, notation, castling } = move;
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        
        // Get positions
        const fromPos = `${fromRow},${fromCol}`;
        const toPos = `${toRow},${toCol}`;
        
        // Clone the board
        const newBoard = { ...game.board };
        
        // Move the piece
        const piece = newBoard[fromPos];
        delete newBoard[fromPos];
        newBoard[toPos] = piece;
        
        // Handle castling (moving the rook as well)
        if (castling) {
          const { rookFrom, rookTo } = castling;
          const [rookFromRow, rookFromCol] = rookFrom;
          const [rookToRow, rookToCol] = rookTo;
          
          const rookFromPos = `${rookFromRow},${rookFromCol}`;
          const rookToPos = `${rookToRow},${rookToCol}`;
          
          // Move the rook
          const rookPiece = newBoard[rookFromPos];
          delete newBoard[rookFromPos];
          newBoard[rookToPos] = rookPiece;
        }
        
        // Handle captures
        const captures = { ...game.captures };
        if (capture) {
          captures[playerId] = [...captures[playerId], capture];
        }
        
        // Add the move to history
        const moves = [...game.moves, notation];
        
        // Get the next player's turn
        const nextPlayerId = game.players.find(p => p !== playerId)!;
        
        // Check for game over conditions (checkmate, stalemate)
        let status = 'active';
        let winner = null; // Use null instead of undefined
        
        if (move.checkmate) {
          status = 'completed';
          winner = playerId;
        } else if (move.stalemate || move.draw) {
          status = 'completed';
          winner = 'draw'; // Set to 'draw' for stalemate/draw
        }
        
        // Create update object without undefined values
        const gameUpdate: any = {
          board: newBoard,
          captures,
          moves,
          timeRemaining: updatedTimeRemaining,
          lastMoveTime: now,
          currentTurn: nextPlayerId,
          status,
          lastUpdated: now
        };
        
        // Only include winner if it's not null
        if (winner !== null) {
          gameUpdate.winner = winner;
        }
        
        await updateDoc(gameRef, gameUpdate);
        break;
      }
    }
    
    // Update the game (only for non-hangman and non-memory games)
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

// Helper for evaluating Wordle guesses
const evaluateWordleGuess = (guess: string, targetWord: string): { greens: number[], yellows: number[] } => {
  const result = { greens: [] as number[], yellows: [] as number[] };
  const targetChars = targetWord.split('');
  
  // First pass: find direct matches (greens)
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === targetChars[i]) {
      result.greens.push(i);
      targetChars[i] = '#'; // Mark as used
    }
  }
  
  // Second pass: find partial matches (yellows)
  for (let i = 0; i < guess.length; i++) {
    if (!result.greens.includes(i)) {
      const targetIndex = targetChars.indexOf(guess[i]);
      if (targetIndex !== -1) {
        result.yellows.push(i);
        targetChars[targetIndex] = '#'; // Mark as used
      }
    }
  }
  
  return result;
};

// Helper function to determine Wordle winner
const determineWordleWinner = (game: WordleGame): string | null => {
  const [player1, player2] = game.players;
  const p1Guesses = game.playerGuesses[player1];
  const p2Guesses = game.playerGuesses[player2];

  // Check if either player has guessed the word correctly
  const p1LastGuess = p1Guesses.guesses[p1Guesses.guesses.length - 1];
  const p2LastGuess = p2Guesses.guesses[p2Guesses.guesses.length - 1];

  if (p1LastGuess === game.word) return player1;
  if (p2LastGuess === game.word) return player2;

  // If both players have used all guesses
  if (p1Guesses.guesses.length === game.maxGuesses && p2Guesses.guesses.length === game.maxGuesses) {
    const p1Greens = p1Guesses.results[p1Guesses.results.length - 1].greens.length;
    const p2Greens = p2Guesses.results[p2Guesses.results.length - 1].greens.length;

    if (p1Greens !== p2Greens) {
      return p1Greens > p2Greens ? player1 : player2;
    }

    const p1Yellows = p1Guesses.results[p1Guesses.results.length - 1].yellows.length;
    const p2Yellows = p2Guesses.results[p2Guesses.results.length - 1].yellows.length;

    if (p1Yellows !== p2Yellows) {
      return p1Yellows > p2Yellows ? player1 : player2;
    }

    // If still tied, compare finish times
    if (game.finishTimes[player1] && game.finishTimes[player2]) {
      return game.finishTimes[player1]!.seconds < game.finishTimes[player2]!.seconds ? player1 : player2;
    }
  }

  return null;
}; 