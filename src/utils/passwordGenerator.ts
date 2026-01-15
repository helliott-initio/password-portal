// Password generator using custom word lists
// Simple: TreeBridge47 (Word + Word + 2 digits)
// Secure: Movie3Cartoon)Bottle (Word + digit + Word + symbol + Word)

// Default word lists
const defaultWords = [
  'Tree', 'Bridge', 'Cloud', 'River', 'Stone', 'Light', 'Storm', 'Flame',
  'Tiger', 'Eagle', 'Falcon', 'Phoenix', 'Dragon', 'Lion', 'Wolf', 'Bear',
  'Swift', 'Bright', 'Golden', 'Silver', 'Crystal', 'Sunny', 'Ocean', 'Forest',
  'Mountain', 'Thunder', 'Sunset', 'Autumn', 'Spring', 'Summer', 'Winter', 'Cosmic',
  'Movie', 'Cartoon', 'Bottle', 'Planet', 'Garden', 'Castle', 'Arrow', 'Shield',
  'Rocket', 'Meadow', 'Breeze', 'Frost', 'Comet', 'Blaze', 'Valley', 'Grove',
  'Hawk', 'Dolphin', 'Panther', 'Jaguar', 'Cobra', 'Raven', 'Owl', 'Fox',
  'Brave', 'Calm', 'Cool', 'Warm', 'Fresh', 'Strong', 'Quick', 'Smart'
];

const symbols = ['!', '@', '#', '$', '%', '&', '*', ')', '+', '='];

export type PasswordMode = 'simple' | 'secure';

export interface GeneratorOptions {
  words?: string[];
  mode?: PasswordMode;
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

// Generate random single digit (0-9)
function randomDigit(): string {
  return secureRandom(10).toString();
}

// Generate random two digit number (10-99)
function randomTwoDigits(): string {
  return (10 + secureRandom(90)).toString();
}

// Generate a Simple password: Word + Word + 2 digits
// Example: TreeBridge47
function generateSimplePassword(words: string[]): string {
  const word1 = pickRandom(words);
  const word2 = pickRandom(words);
  const digits = randomTwoDigits();

  return `${word1}${word2}${digits}`;
}

// Generate a Secure password: Word + digit + Word + symbol + Word
// Example: Movie3Cartoon)Bottle
function generateSecurePassword(words: string[]): string {
  const word1 = pickRandom(words);
  const digit = randomDigit();
  const word2 = pickRandom(words);
  const symbol = pickRandom(symbols);
  const word3 = pickRandom(words);

  return `${word1}${digit}${word2}${symbol}${word3}`;
}

// Generate a password based on mode
export function generatePassword(options: GeneratorOptions = {}): string {
  const { words = defaultWords, mode = 'simple' } = options;

  if (mode === 'secure') {
    return generateSecurePassword(words);
  }
  return generateSimplePassword(words);
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
  selectedList?: string,
  mode?: PasswordMode
): GeneratorOptions {
  const options: GeneratorOptions = { mode };

  if (!selectedList || wordLists.length === 0) {
    return options; // Use defaults
  }

  const list = wordLists.find((l) => l.name === selectedList);
  if (list) {
    options.words = list.words;
  }

  return options;
}
