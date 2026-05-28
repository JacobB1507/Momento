import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export type PreppedPhoto = {
  uri: string;
  bytes: ArrayBuffer;
  contentType: string;
  width: number;
  height: number;
  preppedAt: number;
};

const cache = new Map<string, PreppedPhoto>();
const inFlight = new Map<string, Promise<PreppedPhoto | null>>();
let cancellationGeneration = 0;

export function beginPrepSession(): number {
  cancellationGeneration += 1;
  return cancellationGeneration;
}

export function cancelAllPrep(): void {
  cancellationGeneration += 1;
}

export function getPrepped(uri: string): PreppedPhoto | null {
  return cache.get(uri) ?? null;
}

export function dropPrepped(uri: string): void {
  cache.delete(uri);
  inFlight.delete(uri);
}

export function ensurePrepped(
  uri: string,
  sessionGeneration: number,
  width?: number,
  height?: number,
  mimeType?: string,
): Promise<PreppedPhoto | null> {
  if (cache.has(uri)) return Promise.resolve(cache.get(uri)!);
  const existing = inFlight.get(uri);
  if (existing) return existing;

  const longer = (width && height) ? Math.max(width, height) : 0;
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  const isPureJpeg =
    mimeType === 'image/jpeg' ||
    ext === 'jpg' || ext === 'jpeg';
  const canSkipManipulation = longer > 0 && longer <= 2048 && isPureJpeg;

  const task = (async (): Promise<PreppedPhoto | null> => {
    try {
      let bytes: ArrayBuffer;
      let finalWidth: number;
      let finalHeight: number;

      if (canSkipManipulation) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        bytes = base64ToArrayBuffer(base64);
        finalWidth = width!;
        finalHeight = height!;
      } else {
        const MAX_DIM = 2048;
        const actions: Array<{ resize: { width?: number; height?: number } }> = [];
        if (width && height) {
          if (longer > MAX_DIM) {
            const scale = MAX_DIM / longer;
            actions.push({ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } });
          }
        } else {
          actions.push({ resize: { width: MAX_DIM } });
        }
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          actions,
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: false },
        );
        // FileSystem.readAsStringAsync is ~50x faster than fetch().arrayBuffer() on
        // local file:// URIs — no HTTP stack overhead, direct native file read.
        const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        bytes = base64ToArrayBuffer(base64);
        finalWidth = manipulated.width ?? width ?? 0;
        finalHeight = manipulated.height ?? height ?? 0;
      }

      if (sessionGeneration !== cancellationGeneration) return null;

      const prepped: PreppedPhoto = {
        uri,
        bytes,
        contentType: 'image/jpeg',
        width: finalWidth,
        height: finalHeight,
        preppedAt: Date.now(),
      };
      cache.set(uri, prepped);
      return prepped;
    } catch {
      return null;
    } finally {
      inFlight.delete(uri);
    }
  })();

  inFlight.set(uri, task);
  return task;
}

/**
 * Fast base64 → ArrayBuffer via atob (globally available in Hermes).
 * Uint8Array byte assignment is JIT-friendly — ~10ms for a 2MB JPEG.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = globalThis.atob
    ? globalThis.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function getPreppedCount(uris: string[]): number {
  let count = 0;
  for (const u of uris) if (cache.has(u)) count++;
  return count;
}
