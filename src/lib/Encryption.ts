import * as crypto from 'crypto';

export const CypherX = {
  /**
   * Encrypts text using AES-256-GCM
   * @param text - Text to encrypt
   * @param key - 32 byte encryption key
   * @returns string - Format: iv:authTag:encryptedData
   */
  encrypt(text: string, key: string): string {
    // Ensure key is proper length
    if (Buffer.from(key, 'hex').length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    // Generate random IV and create buffer
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      iv
    );
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag for authentication
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  },

  /**
   * Decrypts text using AES-256-GCM
   * @param encryptedText - Format: iv:authTag:encryptedData
   * @param key - 32 byte encryption key
   * @returns string - Decrypted text
   */
  decrypt(encryptedText: string, key: string): string {
    if (Buffer.from(key, 'hex').length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    try {
      // Split the encrypted text into components
      const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');

      if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted text format');
      }

      // Convert hex strings to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'hex'),
        iv
      );
      
      decipher.setAuthTag(authTag);

      // Decrypt the text
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Decryption failed: ${error.message}`);
          } else {
            throw new Error(`Decryption failed: An unknown error occurred`);
        }
    }
  },

  /**
   * Generates a random 32-byte encryption key
   * @returns string - 64 character hex string
   */
  generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
};


// function testEncryption() {
//   const key = CypherX.generateKey();
//   const text = 'Hello, Woold!';
  
//   console.log('Original text:', text);
//   console.log('Key:', key);
  
//   const encrypted = CypherX.encrypt(text, key);
//   console.log('Encrypted:', encrypted);
  
//   const decrypted = CypherX.decrypt(encrypted, key);
//   console.log('Decrypted:', decrypted);
  
//   console.log('Test passed:', text === decrypted);
// }


// testEncryption();

export default CypherX;