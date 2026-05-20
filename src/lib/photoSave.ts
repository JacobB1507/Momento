import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system';
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
    let downloadedFile: File | null = null;
    try {
      downloadedFile = await File.downloadFileAsync(photo.url, Paths.cache);
      if (!downloadedFile || !downloadedFile.exists) {
        failedCount++;
        continue;
      }
      await MediaLibrary.saveToLibraryAsync(downloadedFile.uri);
      successIds.push(photo.id);
      savedCount++;
    } catch (e) {
      console.warn('[photoSave] failed to save photo', photo.id, e);
      failedCount++;
    } finally {
      try {
        if (downloadedFile && downloadedFile.exists) {
          downloadedFile.delete();
        }
      } catch (cleanupErr) {
        console.warn('[photoSave] cleanup failed:', cleanupErr);
      }
    }
  }

  if (successIds.length > 0) {
    await addSavedPhotoIds(userId, galleryId, successIds);
  }

  return { savedCount, skippedDuplicateCount, failedCount, permissionDenied: false };
}

export async function sharePhotos(photos: SavablePhoto[]): Promise<{ shared: boolean }> {
  if (!Array.isArray(photos) || photos.length === 0) throw new Error('No photos to share');

  const downloadResults = await Promise.allSettled(
    photos.map((p) => File.downloadFileAsync(p.url, Paths.cache)),
  );

  const downloadedFiles = downloadResults
    .filter((r): r is PromiseFulfilledResult<File> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (downloadedFiles.length === 0) return { shared: false };

  let sharedCount = 0;
  try {
    for (const file of downloadedFiles) {
      if (!file.exists) continue;
      try {
        await Sharing.shareAsync(file.uri);
        sharedCount++;
      } catch {
        break;
      }
    }
  } finally {
    for (const file of downloadedFiles) {
      try {
        if (file && file.exists) {
          file.delete();
        }
      } catch (cleanupErr) {
        console.warn('[photoSave] cleanup failed:', cleanupErr);
      }
    }
  }

  return { shared: sharedCount > 0 };
}
