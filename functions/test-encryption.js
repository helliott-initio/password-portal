const crypto = require('crypto');

// Paste your ENCRYPTION_KEY here to test
const ENCRYPTION_KEY = process.argv[2] || 'YOUR_KEY_HERE';

console.log('Key length:', ENCRYPTION_KEY.length, 'characters');
console.log('Key (first 8 chars):', ENCRYPTION_KEY.substring(0, 8) + '...');

try {
  // Convert from hex to buffer
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  console.log('Key buffer length:', keyBuffer.length, 'bytes');

  if (keyBuffer.length !== 32) {
    console.error('❌ ERROR: Key must be 32 bytes (64 hex characters)');
    console.log('   Your key is', keyBuffer.length, 'bytes');
    process.exit(1);
  }

  // Test encryption
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update('TestPassword123', 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  console.log('✅ Encryption successful!');
  console.log('   Encrypted:', encrypted);
  console.log('   IV:', iv.toString('hex'));
  console.log('   Auth Tag:', authTag.toString('hex'));

  // Test decryption
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  console.log('✅ Decryption successful!');
  console.log('   Decrypted:', decrypted);

} catch (error) {
  console.error('❌ ERROR:', error.message);
}
