// Password generator using custom word lists
// Generates memorable passwords like "Sunset-Tiger-42-Cloud"

// Default word lists (can be overridden from Firestore)
const defaultAdjectives = [
  'Swift', 'Bright', 'Golden', 'Silver', 'Crystal', 'Sunny', 'Happy', 'Lucky',
  'Clever', 'Brave', 'Calm', 'Cool', 'Warm', 'Fresh', 'Strong', 'Quick',
  'Smart', 'Gentle', 'Noble', 'Royal', 'Cosmic', 'Stellar', 'Ocean', 'Forest',
  'Mountain', 'River', 'Thunder', 'Lightning', 'Sunset', 'Sunrise', 'Midnight',
  'Autumn', 'Spring', 'Summer', 'Winter', 'Arctic', 'Tropical', 'Radiant', 'Mystic'
];

const defaultNouns = [
  'Tiger', 'Eagle', 'Falcon', 'Phoenix', 'Dragon', 'Lion', 'Wolf', 'Bear',
  'Hawk', 'Dolphin', 'Panther', 'Jaguar', 'Leopard', 'Cobra', 'Raven', 'Owl',
  'Fox', 'Stag', 'Heron', 'Crane', 'Swan', 'Kite', 'Lynx', 'Puma',
  'Cloud', 'Storm', 'Wave', 'Stone', 'Star', 'Moon', 'Comet', 'Blaze',
  'Frost', 'Flame', 'Thunder', 'Breeze', 'Peak', 'Valley', 'Grove', 'Meadow'
];

export interface GeneratorOptions {
  adjectives?: string[];
  nouns?: string[];
  includeNumber?: boolean;
  numberRange?: { min: number; max: number };
  separator?: string;
  wordCount?: number;
}

// Cryptographically secure random number generator
function secureRandom(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

// Pick random item from array
function pickRandom<T>(arr: T[]): T {
  return arr[secureRandom(arr.length)];
}

// Generate random number in range
function randomNumber(min: number, max: number): number {
  return min + secureRandom(max - min + 1);
}

// Generate a memorable password
export function generatePassword(options: GeneratorOptions = {}): string {
  const {
    adjectives = defaultAdjectives,
    nouns = defaultNouns,
    includeNumber = true,
    numberRange = { min: 10, max: 99 },
    separator = '-',
    wordCount = 2,
  } = options;

  const parts: string[] = [];

  // Add words (alternating adjective/noun pattern)
  for (let i = 0; i < wordCount; i++) {
    if (i % 2 === 0) {
      parts.push(pickRandom(adjectives));
    } else {
      parts.push(pickRandom(nouns));
    }
  }

  // Add number
  if (includeNumber) {
    const num = randomNumber(numberRange.min, numberRange.max);
    // Insert number in a random position (not at the start)
    const insertPos = 1 + secureRandom(parts.length);
    parts.splice(insertPos, 0, num.toString());
  }

  return parts.join(separator);
}

// Generate multiple password options for user to choose from
export function generatePasswordOptions(
  count: number = 3,
  options: GeneratorOptions = {}
): string[] {
  const passwords: string[] = [];
  for (let i = 0; i < count; i++) {
    passwords.push(generatePassword(options));
  }
  return passwords;
}

// Validate password strength (basic check)
export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

// Get word list from Firestore word lists
export function buildGeneratorOptions(
  wordLists: { name: string; words: string[] }[],
  selectedList?: string
): GeneratorOptions {
  if (!selectedList || wordLists.length === 0) {
    return {}; // Use defaults
  }

  const list = wordLists.find((l) => l.name === selectedList);
  if (!list) {
    return {}; // Use defaults
  }

  // Split words into adjectives (first half) and nouns (second half)
  // Or if the list is small, use all words for both
  const words = list.words;
  if (words.length < 10) {
    return {
      adjectives: words,
      nouns: words,
    };
  }

  const mid = Math.floor(words.length / 2);
  return {
    adjectives: words.slice(0, mid),
    nouns: words.slice(mid),
  };
}
