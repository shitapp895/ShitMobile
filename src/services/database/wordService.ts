import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/config';

// List of 5-letter words related to bathroom/toilet theme
const WORD_LIST = [
  'FLUSH', 'WIPES', 'PAPER', 'CLEAN', 'SPRAY',
  'BRUSH', 'TOWEL', 'WATER', 'DRAIN', 'STALL',
  'BIDET', 'SEWER', 'PLUMB', 'WASTE', 'SMELL',
  'STINK', 'FRESH', 'RINSE', 'SCRUB', 'SHINE',
  'MOIST', 'DIRTY', 'SCENT', 'STEAM', 'WIPER',
  'TOILET', 'POOPY', 'POTTY', 'PIPES', 'VALVE',
  'BASIN', 'BOWEL', 'COLON', 'FIBER', 'WIPES',
  'SWIRL', 'FLOAT', 'CAULK', 'GROUT', 'LEAKY'
];

// Collection reference
const wordsCollection = collection(firestore, 'words');

/**
 * Get a random word from the word list
 */
export const getRandomWord = (): string => {
  const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
  return WORD_LIST[randomIndex];
};

/**
 * Check if a word exists in the word list
 */
export const isValidWord = (word: string): boolean => {
  return WORD_LIST.includes(word.toUpperCase());
};

/**
 * Initialize the word list in Firestore if it doesn't exist
 */
export const initializeWordList = async () => {
  const wordListDoc = doc(wordsCollection, 'wordList');
  const docSnapshot = await getDoc(wordListDoc);

  if (!docSnapshot.exists()) {
    await setDoc(wordListDoc, {
      words: WORD_LIST,
      lastUpdated: new Date()
    });
  }
}; 