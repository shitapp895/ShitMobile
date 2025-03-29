import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChessGame as ChessGameType } from '../services/database/gameService';
import { auth } from '../firebase/config';

// Chess pieces images (replace these URLs with your actual assets)
const chessPieces = {
  // White pieces
  'P': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',  // White pawn
  'N': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',  // White knight
  'B': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',  // White bishop
  'R': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',  // White rook
  'Q': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',  // White queen
  'K': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',  // White king
  
  // Black pieces
  'p': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',  // Black pawn
  'n': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',  // Black knight
  'b': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',  // Black bishop
  'r': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',  // Black rook
  'q': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',  // Black queen
  'k': 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',  // Black king
};

interface ChessGameProps {
  game: ChessGameType;
  onMove: (move: any) => void;
  disabled: boolean;
}

const BOARD_SIZE = Dimensions.get('window').width - 32;
const SQUARE_SIZE = BOARD_SIZE / 8;
const PIECE_SIZE = SQUARE_SIZE * 0.85;

const ChessGame: React.FC<ChessGameProps> = ({ game, onMove, disabled }) => {
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<[number, number][]>([]);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [timeLeft, setTimeLeft] = useState<{[playerId: string]: number}>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Initialize player color only once when component mounts
  useEffect(() => {
    // Get current user ID from Firebase Auth
    const currentUserId = auth.currentUser?.uid;
    
    if (currentUserId && game.players.length === 2) {
      // First player (index 0) is always white in our data model
      const isWhitePlayer = game.players[0] === currentUserId;
      setPlayerColor(isWhitePlayer ? 'white' : 'black');
    }
    
    // Set initial time
    setTimeLeft(game.timeRemaining);
  }, []); // Empty dependency array means this only runs once
  
  // Handle timer
  useEffect(() => {
    if (game.status === 'active') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          const newTime = { ...prevTime };
          if (newTime[game.currentTurn] > 0) {
            newTime[game.currentTurn] -= 1;
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [game.status, game.currentTurn]);
  
  // Check if time runs out
  useEffect(() => {
    if (timeLeft[game.currentTurn] !== undefined && 
        timeLeft[game.currentTurn] <= 0 && 
        game.status === 'active') {
      Alert.alert('Time\'s up!', `${getPlayerName(game.currentTurn)} ran out of time!`);
    }
  }, [timeLeft, game.currentTurn, game.status]);
  
  const getPlayerName = (playerId: string) => {
    return playerId === game.players[0] ? 'White' : 'Black';
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Get piece at position
  const getPiece = (row: number, col: number): string => {
    return game.board[`${row},${col}`] || '';
  };
  
  // Check if a piece belongs to the current player
  const isPlayerPiece = (piece: string) => {
    if (!piece) return false;
    
    if (playerColor === 'white') {
      return piece === piece.toUpperCase(); // White pieces are uppercase
    } else {
      return piece === piece.toLowerCase(); // Black pieces are lowercase
    }
  };
  
  // Get basic moves for a piece without considering check
  const getBasicMoves = (row: number, col: number, piece: string): [number, number][] => {
    if (!piece) return [];
    
    const moves: [number, number][] = [];
    const pieceType = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();
    
    // Check if a position is valid (on board and not occupied by own piece)
    const isValidPosition = (r: number, c: number) => {
      if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
      const targetPiece = getPiece(r, c);
      // Empty square or opponent's piece
      return !targetPiece || (piece === piece.toUpperCase()) !== (targetPiece === targetPiece.toUpperCase());
    };
    
    // Check if path is clear (for pieces that can't jump)
    const isPathClear = (startRow: number, startCol: number, endRow: number, endCol: number) => {
      const rowStep = endRow > startRow ? 1 : (endRow < startRow ? -1 : 0);
      const colStep = endCol > startCol ? 1 : (endCol < startCol ? -1 : 0);
      
      let r = startRow + rowStep;
      let c = startCol + colStep;
      
      while (r !== endRow || c !== endCol) {
        if (getPiece(r, c)) return false;
        r += rowStep;
        c += colStep;
      }
      
      return true;
    };
    
    switch (pieceType) {
      case 'p': { // Pawn
        const direction = isWhite ? -1 : 1; // white pawns move up, black move down
        const startRow = isWhite ? 6 : 1;   // starting rows for pawns
        
        // Forward move (1 square)
        if (!getPiece(row + direction, col) && isValidPosition(row + direction, col)) {
          moves.push([row + direction, col]);
          
          // First move can be 2 squares if path is clear
          if (row === startRow && !getPiece(row + direction * 2, col) && isValidPosition(row + direction * 2, col)) {
            moves.push([row + direction * 2, col]);
          }
        }
        
        // Diagonal captures
        const captureOffsets = [[direction, -1], [direction, 1]];
        captureOffsets.forEach(([rOffset, cOffset]) => {
          const newRow = row + rOffset;
          const newCol = col + cOffset;
          const targetPiece = getPiece(newRow, newCol);
          
          if (targetPiece && isValidPosition(newRow, newCol) && 
              (isWhite ? targetPiece === targetPiece.toLowerCase() : targetPiece === targetPiece.toUpperCase())) {
            moves.push([newRow, newCol]);
          }
        });
        break;
      }
      
      case 'r': { // Rook
        // Horizontal and vertical moves
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        directions.forEach(([rOffset, cOffset]) => {
          for (let i = 1; i < 8; i++) {
            const newRow = row + rOffset * i;
            const newCol = col + cOffset * i;
            
            if (!isValidPosition(newRow, newCol)) break;
            
            moves.push([newRow, newCol]);
            
            // Stop if we hit a piece
            if (getPiece(newRow, newCol)) break;
          }
        });
        break;
      }
      
      case 'n': { // Knight (can jump over pieces)
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        knightMoves.forEach(([rOffset, cOffset]) => {
          const newRow = row + rOffset;
          const newCol = col + cOffset;
          
          if (isValidPosition(newRow, newCol)) {
            moves.push([newRow, newCol]);
          }
        });
        break;
      }
      
      case 'b': { // Bishop
        // Diagonal moves
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        directions.forEach(([rOffset, cOffset]) => {
          for (let i = 1; i < 8; i++) {
            const newRow = row + rOffset * i;
            const newCol = col + cOffset * i;
            
            if (!isValidPosition(newRow, newCol)) break;
            
            moves.push([newRow, newCol]);
            
            // Stop if we hit a piece
            if (getPiece(newRow, newCol)) break;
          }
        });
        break;
      }
      
      case 'q': { // Queen (combination of rook and bishop)
        // Horizontal, vertical and diagonal moves
        const directions = [
          [0, 1], [1, 0], [0, -1], [-1, 0],  // Rook moves
          [1, 1], [1, -1], [-1, 1], [-1, -1] // Bishop moves
        ];
        
        directions.forEach(([rOffset, cOffset]) => {
          for (let i = 1; i < 8; i++) {
            const newRow = row + rOffset * i;
            const newCol = col + cOffset * i;
            
            if (!isValidPosition(newRow, newCol)) break;
            
            moves.push([newRow, newCol]);
            
            // Stop if we hit a piece
            if (getPiece(newRow, newCol)) break;
          }
        });
        break;
      }
      
      case 'k': { // King
        // One square in any direction
        const directions = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1]
        ];
        
        directions.forEach(([rOffset, cOffset]) => {
          const newRow = row + rOffset;
          const newCol = col + cOffset;
          
          if (isValidPosition(newRow, newCol)) {
            moves.push([newRow, newCol]);
          }
        });
        
        // Castling
        // Check if the king is in the starting position
        const kingStartRow = isWhite ? 7 : 0;
        if (row === kingStartRow && col === 4) {
          // Check if king has moved (we use moves history to determine this)
          const kingHasMoved = game.moves.some(move => {
            // Parse the move to see if it involved the king
            // King moves would include column 'e' (index 4)
            return move.includes(String.fromCharCode(97 + col)) && 
                   move.includes(String(8 - row));
          });
          
          if (!kingHasMoved) {
            // Kingside castling (O-O)
            const kingsideRook = getPiece(row, 7);
            if (kingsideRook && kingsideRook.toLowerCase() === 'r' && 
                (kingsideRook === 'R') === isWhite) {
              
              // Check if rook has moved
              const rookHasMoved = game.moves.some(move => {
                // Parse the move to see if it involved the rook at h-file (index 7)
                return move.includes(String.fromCharCode(97 + 7)) && 
                       move.includes(String(8 - row));
              });
              
              // Path must be clear between king and rook
              const pathClear = !getPiece(row, 5) && !getPiece(row, 6);
              
              if (!rookHasMoved && pathClear) {
                // Check if king passes through check during castling
                // This will be verified in getPossibleMoves
                moves.push([row, 6]); // Kingside castling
              }
            }
            
            // Queenside castling (O-O-O)
            const queensideRook = getPiece(row, 0);
            if (queensideRook && queensideRook.toLowerCase() === 'r' && 
                (queensideRook === 'R') === isWhite) {
              
              // Check if rook has moved
              const rookHasMoved = game.moves.some(move => {
                // Parse the move to see if it involved the rook at a-file (index 0)
                return move.includes(String.fromCharCode(97 + 0)) && 
                       move.includes(String(8 - row));
              });
              
              // Path must be clear between king and rook
              const pathClear = !getPiece(row, 1) && !getPiece(row, 2) && !getPiece(row, 3);
              
              if (!rookHasMoved && pathClear) {
                // Check if king passes through check during castling
                // This will be verified in getPossibleMoves
                moves.push([row, 2]); // Queenside castling
              }
            }
          }
        }
        break;
      }
    }
    
    return moves;
  };
  
  // Find king position for a given color
  const findKing = (isWhiteKing: boolean): [number, number] | null => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = getPiece(row, col);
        if (piece && piece.toLowerCase() === 'k' && (piece === 'K') === isWhiteKing) {
          return [row, col];
        }
      }
    }
    return null;
  };
  
  // Check if a king is under attack (in check) - uses getBasicMoves to avoid recursion
  const isKingInCheck = (isWhiteKing: boolean): boolean => {
    const kingPos = findKing(isWhiteKing);
    if (!kingPos) return false;
    
    // Check if any opponent piece can attack the king
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = getPiece(row, col);
        // Skip empty squares or own pieces
        if (!piece || (piece === piece.toUpperCase()) === isWhiteKing) continue;
        
        // Check if this opponent piece can capture the king using basic moves
        const moves = getBasicMoves(row, col, piece);
        if (moves.some(([r, c]) => r === kingPos[0] && c === kingPos[1])) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Get possible moves for a piece - now uses getBasicMoves and filters based on check
  const getPossibleMoves = (row: number, col: number): [number, number][] => {
    const piece = getPiece(row, col);
    if (!piece) return [];
    
    // Get basic moves without considering check
    const standardMoves = getBasicMoves(row, col, piece);
    
    // Check if player is in check and filter moves accordingly
    const isCurrentPlayerWhite = piece === piece.toUpperCase();
    
    // If in check, only return moves that get the king out of check
    // Filter moves to only those that don't leave king in check
    const legalMoves: [number, number][] = [];
    
    // For each potential move, check if it would leave the king in check
    for (const [newRow, newCol] of standardMoves) {
      // Simulate the move
      const originalPiece = piece;
      const capturedPiece = getPiece(newRow, newCol);
      
      // Make temporary move
      game.board[`${newRow},${newCol}`] = originalPiece;
      delete game.board[`${row},${col}`];
      
      // Check if king is in check after move
      const kingInCheck = isKingInCheck(isCurrentPlayerWhite);
      
      // Undo move
      game.board[`${row},${col}`] = originalPiece;
      if (capturedPiece) {
        game.board[`${newRow},${newCol}`] = capturedPiece;
      } else {
        delete game.board[`${newRow},${newCol}`];
      }
      
      // Add to legal moves if this move doesn't leave king in check
      if (!kingInCheck) {
        legalMoves.push([newRow, newCol]);
      }
    }
    
    return legalMoves;
  };
  
  // Check if the opponent is in checkmate after a move
  const isOpponentInCheckmate = (opponentIsWhite: boolean): boolean => {
    // First check if the opponent's king is in check
    if (!isKingInCheck(opponentIsWhite)) {
      return false;
    }
    
    // Try every possible move for the opponent to see if they can escape check
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = getPiece(row, col);
        // Skip empty squares or current player's pieces
        if (!piece || (piece === piece.toUpperCase()) !== opponentIsWhite) continue;
        
        // Get legal moves for this piece
        const moves = getPossibleMoves(row, col);
        
        // If any piece has legal moves, it's not checkmate
        if (moves.length > 0) {
          return false;
        }
      }
    }
    
    // If no move can get out of check, it's checkmate
    return true;
  };
  
  const handleSquarePress = (row: number, col: number) => {
    if (disabled || game.status !== 'active') return;
    
    const piece = getPiece(row, col);
    
    // If a piece is already selected
    if (selectedPiece) {
      const [selectedRow, selectedCol] = selectedPiece;
      
      // Check if the target square is a valid move
      if (possibleMoves.some(([r, c]) => r === row && c === col)) {
        // Get the selected piece
        const selectedPiece = getPiece(selectedRow, selectedCol);
        
        // Check for castling
        let isCastling = false;
        let rookFromRow = -1;
        let rookFromCol = -1;
        let rookToRow = -1;
        let rookToCol = -1;
        let castlingNotation = '';
        
        // If king is selected and moving two squares horizontally, it's castling
        if (selectedPiece && selectedPiece.toLowerCase() === 'k' && Math.abs(col - selectedCol) === 2) {
          isCastling = true;
          
          // Determine rook positions based on castling direction
          rookFromRow = selectedRow;
          rookToRow = selectedRow;
          
          if (col > selectedCol) {
            // Kingside castling (O-O)
            rookFromCol = 7;
            rookToCol = 5;
            castlingNotation = 'O-O';
          } else {
            // Queenside castling (O-O-O)
            rookFromCol = 0;
            rookToCol = 3;
            castlingNotation = 'O-O-O';
          }
        }
        
        // Capture logic
        const targetPiece = getPiece(row, col);
        const capture = targetPiece || null;
        
        // Basic move notation (e.g., "e2-e4")
        let notation = isCastling ? castlingNotation : 
          `${String.fromCharCode(97 + selectedCol)}${8 - selectedRow}-${String.fromCharCode(97 + col)}${8 - row}`;
        
        // Get if the current player is white
        const isCurrentPlayerWhite = game.currentTurn === game.players[0];
        const opponentIsWhite = !isCurrentPlayerWhite;
        
        // Simulate the move
        const originalPiece = getPiece(selectedRow, selectedCol);
        const capturedPiece = getPiece(row, col);
        
        // Make temporary move
        game.board[`${row},${col}`] = originalPiece;
        delete game.board[`${selectedRow},${selectedCol}`];
        
        // If castling, also move the rook in the simulation
        if (isCastling) {
          const rookPiece = getPiece(rookFromRow, rookFromCol);
          if (rookPiece) {
            game.board[`${rookToRow},${rookToCol}`] = rookPiece;
            delete game.board[`${rookFromRow},${rookFromCol}`];
          }
        }
        
        // Check if this move puts opponent in check/checkmate
        const opponentInCheck = isKingInCheck(opponentIsWhite);
        const checkmate = opponentInCheck && isOpponentInCheckmate(opponentIsWhite);
        
        // Undo move to avoid affecting state
        game.board[`${selectedRow},${selectedCol}`] = originalPiece;
        if (capturedPiece) {
          game.board[`${row},${col}`] = capturedPiece;
        } else {
          delete game.board[`${row},${col}`];
        }
        
        // If castling, undo rook move in the simulation
        if (isCastling) {
          const rookPiece = getPiece(rookToRow, rookToCol);
          if (rookPiece) {
            game.board[`${rookFromRow},${rookFromCol}`] = rookPiece;
            delete game.board[`${rookToRow},${rookToCol}`];
          }
        }
        
        // Add check/checkmate info to the move
        if (!isCastling) { // Don't append to castling notation
          if (checkmate) {
            notation += '#'; // Checkmate symbol
          } else if (opponentInCheck) {
            notation += '+'; // Check symbol
          }
        }
        
        // Create the move object for the server
        const moveObject: any = {
          from: [selectedRow, selectedCol],
          to: [row, col],
          capture: capture,
          notation: notation,
          checkmate: checkmate,
          check: opponentInCheck
        };
        
        // If castling, add extra information
        if (isCastling) {
          moveObject.castling = {
            rookFrom: [rookFromRow, rookFromCol],
            rookTo: [rookToRow, rookToCol]
          };
        }
        
        // Make the move with the server
        onMove(moveObject);
        
        // Reset selection
        setSelectedPiece(null);
        setPossibleMoves([]);
      } else if (isPlayerPiece(piece)) {
        // Select a different piece
        setSelectedPiece([row, col]);
        setPossibleMoves(getPossibleMoves(row, col));
      } else {
        // Deselect
        setSelectedPiece(null);
        setPossibleMoves([]);
      }
    } else if (isPlayerPiece(piece)) {
      // Select a piece
      setSelectedPiece([row, col]);
      setPossibleMoves(getPossibleMoves(row, col));
    }
  };
  
  const renderPiece = (piece: string) => {
    return chessPieces[piece] || '';
  };
  
  const renderSquare = (row: number, col: number) => {
    const piece = getPiece(row, col);
    const isWhiteSquare = (row + col) % 2 === 0;
    const isSelected = selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col;
    const isPossibleMove = possibleMoves.some(([r, c]) => r === row && c === col);
    
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.square,
          isWhiteSquare ? styles.whiteSquare : styles.blackSquare,
          isSelected && styles.selectedSquare,
          isPossibleMove && styles.possibleMoveSquare
        ]}
        onPress={() => handleSquarePress(row, col)}
        disabled={disabled}
      >
        {piece ? (
          <View style={[
            styles.pieceContainer,
            isSelected && styles.selectedPieceContainer
          ]}>
            <Image 
              source={{ uri: renderPiece(piece) }} 
              style={styles.pieceImage}
              resizeMode="contain"
            />
          </View>
        ) : isPossibleMove && (
          <View style={styles.possibleMoveIndicator} />
        )}
      </TouchableOpacity>
    );
  };
  
  // Create board row display with proper orientation based on player color
  const renderBoard = () => {
    // Create array of row indices
    let rowIndices = Array(8).fill(null).map((_, idx) => idx);
    
    // If playing as black, flip the board rows
    if (playerColor === 'black') {
      rowIndices = rowIndices.reverse();
    }
    
    return (
      <View style={styles.boardContainer}>
        {rowIndices.map((row, displayRowIndex) => (
          <View key={row} style={styles.boardRow}>
            {Array(8).fill(null).map((_, col) => {
              // If playing as black, flip the columns too
              const displayCol = playerColor === 'black' ? 7 - col : col;
              return renderSquare(row, displayCol);
            })}
          </View>
        ))}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>
            {playerColor === 'white' ? 'Black' : 'White'}
          </Text>
          <Text style={[
            styles.timerText,
            (timeLeft[playerColor === 'white' ? game.players[1] : game.players[0]] !== undefined && 
             timeLeft[playerColor === 'white' ? game.players[1] : game.players[0]] < 10) && styles.lowTimeText
          ]}>
            {formatTime(timeLeft[playerColor === 'white' ? game.players[1] : game.players[0]] || 0)}
          </Text>
        </View>
      </View>
      
      {renderBoard()}
      
      <View style={styles.timerContainer}>
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>
            {playerColor === 'white' ? 'White' : 'Black'}
          </Text>
          <Text style={[
            styles.timerText,
            (timeLeft[playerColor === 'white' ? game.players[0] : game.players[1]] !== undefined && 
             timeLeft[playerColor === 'white' ? game.players[0] : game.players[1]] < 10) && styles.lowTimeText
          ]}>
            {formatTime(timeLeft[playerColor === 'white' ? game.players[0] : game.players[1]] || 0)}
          </Text>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.turnText}>
          {game.status === 'active' 
            ? `${game.currentTurn === game.players[0] ? 'White' : 'Black'}'s turn` 
            : 'Game Over'}
        </Text>
        
        {game.moves.length > 0 && (
          <View style={styles.lastMoveContainer}>
            <Text style={styles.lastMoveText}>
              Last move: {game.moves[game.moves.length - 1]}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardContainer: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 3,
    borderColor: '#5D4037',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
  },
  boardRow: {
    flexDirection: 'row',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteSquare: {
    backgroundColor: '#E8D0AA', // Light wood color
  },
  blackSquare: {
    backgroundColor: '#8B4513', // Dark wood color
  },
  selectedSquare: {
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  possibleMoveSquare: {
    // This is now handled by the possibleMoveIndicator
  },
  pieceText: {
    fontSize: 38,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  selectedPieceText: {
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5D4037', // Wood-like color for timer
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  timerLabel: {
    color: '#E8D0AA', // Light wood color
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  timerText: {
    color: '#E8D0AA', // Light wood color
    fontSize: 20,
    fontFamily: 'monospace',
  },
  lowTimeText: {
    color: '#FF5252',
  },
  infoContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  turnText: {
    fontSize: 20,
    color: '#5D4037', // Wood-like color
    fontWeight: 'bold',
    marginBottom: 10,
  },
  lastMoveContainer: {
    backgroundColor: '#5D4037', // Wood-like color
    padding: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  lastMoveText: {
    color: '#E8D0AA', // Light wood color
    fontSize: 14,
  },
  pieceContainer: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPieceContainer: {
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  pieceImage: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
  },
  possibleMoveIndicator: {
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15,
    backgroundColor: 'rgba(0, 188, 212, 0.6)',
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 3,
  },
});

export default ChessGame; 