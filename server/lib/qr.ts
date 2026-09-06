import crypto from 'node:crypto';
import QRCode from 'qrcode';

// Secret key used for signing QR hashes to guarantee unguessability and authenticity
const HMAC_SECRET = process.env.METROLOGY_SECRET_KEY || 'legal-metrology-hmac-secret-v1-key-2026';

/**
 * Generates an HMAC-signed cryptographically random token.
 * Format: `<random_32_hex_bytes>.<hmac_digest_16_bytes>`
 * This guarantees the token is unguessable, unique, and tamper-resistant.
 */
export function generateSignedQrHash(certNumber: string, applicationId: string): string {
  // 24 cryptographically secure random bytes = 48 hex chars
  const randomEntropy = crypto.randomBytes(24).toString('hex');
  const payload = `${randomEntropy}:${certNumber}:${applicationId}`;

  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex').substring(0, 24);

  return `${randomEntropy}_${signature}`;
}

/**
 * Verifies if the format matches a valid generated token format
 */
export function isValidQrHashFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('_');
  return parts.length === 2 && parts[0].length === 48 && parts[1].length === 24;
}

/**
 * Generates a QR Code as a Data URL pointing to the public verification page
 */
export async function generateQrDataUrl(verifyUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (error) {
    console.error('Failed to generate QR code data URL:', error);
    // Return empty fallback if generation fails
    return '';
  }
}
