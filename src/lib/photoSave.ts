import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type SavablePhoto = { id: string; url: string };
export type SaveResult = {
  savedCount: number;
  skippedDuplicateCount: number;
  failedCount: number;
  permissionDenied: boolean;
};

const ID_RE = /^[a-zA-Z0-9_-]+$/;

function validateId(id: string, label: string): void {
  if (!id || !ID_RE.test(id)) throw new Error(`Invalid id: ${label}`);
}

export async function getSavedPhotoIds(userId: string, galleryId: string): Promise<Set<string>> {
  validateId(userId, 'userId');
  validateId(galleryId, 'galleryId');
  try {
    const raw = await AsyncStorage.getItem(`momento_saved_photos_${userId}_${galleryId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export async function addSavedPhotoIds(
  userId: string,
  galleryId: string,
  photoIds: string[],
): Promise<void> {
  validateId(userId, 'userId');
  validateId(galleryId, 'galleryId');
  const existing = await getSavedPhotoIds(userId, galleryId);
  for (const id of photoIds) existing.add(id);
  await AsyncStorage.setItem(
    `momento_saved_photos_${userId}_${galleryId}`,
    JSON.stringify([...existing]),
  );
}

export async function getDedupePreference(userId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(`momento_save_dedupe_${userId}`);
    if (raw === null) return true;
    return JSON.parse(raw) === false ? false : true;
  } catch {
    return true;
  }
}

export async function setDedupePreference(userId: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(`momento_save_dedupe_${userId}`, JSON.stringify(value));
}

export async function savePhotosToCameraRoll(args: {
  photos: SavablePhoto[];
  userId: string;
  galleryId: string;
  dedupe: boolean;
}): Promise<SaveResult> {
  const { photos, userId, galleryId, dedupe } = args;

  if (!Array.isArray(photos) || photos.length === 0) throw new Error('photos must be non-empty');
  for (const p of photos) {
    if (!p || typeof p.id !== 'string' || typeof p.url !== 'string')
      throw new Error('each photo must have string id and url');
  }
  if (!userId) throw new Error('userId is required');
  if (!galleryId) throw new Error('galleryId is required');

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    return { savedCount: 0, skippedDuplicateCount: 0, failedCount: 0, permissionDenied: true };
  }

  let candidates = photos;
  let skippedDuplicateCount = 0;
  if (dedupe) {
    const saved = await getSavedPhotoIds(userId, galleryId);
    const filtered = photos.filter((p) => !saved.has(p.id));
    skippedDuplicateCount = photos.length - filtered.length;
    candidates = filtered;
  }

  let savedCount = 0;
  let failedCount = 0;
  const successIds: string[] = [];

  for (const photo of candidates) {
    const tmpUri = `${FileSystem.cacheDirectory}momento_save_${photo.id}.jpg`;
    try {
      const { uri } = await FileSystem.downloadAsync(photo.url, tmpUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      successIds.push(photo.id);
      savedCount++;
    } catch (e) {
      console.warn('[photoSave] failed to save photo', photo.id, e);
      failedCount++;
    } finally {
      FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch((e) =>
        console.warn('[photoSave] cleanup failed', tmpUri, e),
      );
    }
  }

  if (successIds.length > 0) {
    await addSavedPhotoIds(userId, galleryId, successIds);
  }

  return { savedCount, skippedDuplicateCount, failedCount, permissionDenied: false };
}

export async function sharePhotos(photos: SavablePhoto[]): Promise<{ shared: boolean }> {
  if (!Array.isArray(photos) || photos.length === 0) throw new Error('No photos to share');

  const results = await Promise.allSettled(
    photos.map(async (p) => {
      const uri = `${FileSystem.cacheDirectory}momento_share_${p.id}.jpg`;
      await FileSystem.downloadAsync(p.url, uri);
      return uri;
    }),
  );

  const tmpUris = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (tmpUris.length === 0) return { shared: false };

  let sharedCount = 0;
  for (const uri of tmpUris) {
    try {
      await Sharing.shareAsync(uri);
      sharedCount++;
    } catch {
      break;
    }
  }

  for (const uri of tmpUris) {
    try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
  }

  return { shared: sharedCount > 0 };
}
