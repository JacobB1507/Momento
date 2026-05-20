import * as Crypto from 'expo-crypto';

const VALID_PREFIXES = ['file://', 'ph://', 'assets-library://', '/'];

function validateUri(uri: string): void {
  if (!uri || !VALID_PREFIXES.some(p => uri.startsWith(p))) {
    throw new Error('Invalid URI');
  }
}

export async function hashPhotoFile(uri: string): Promise<string> {
  validateUri(uri);

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const digestBuffer = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes
  );

  const hex = Array.from(new Uint8Array(digestBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (!/^[a-f0-9]{64}$/.test(hex)) {
    throw new Error(`Hash output invalid: length=${hex.length}`);
  }

  return hex;
}
