import AsyncStorage from '@react-native-async-storage/async-storage';

export type QueuedPhoto = {
  uri: string;
  mimeType?: string;
  width?: number;
  height?: number;
  status: 'pending' | 'done' | 'failed';
};

export type UploadQueue = {
  galleryId: string;
  galleryTitle: string;
  createdAt: number;
  photos: QueuedPhoto[];
};

function key(userId: string): string {
  return `momento_upload_queue_${userId}`;
}

export async function saveQueue(userId: string, queue: UploadQueue): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify(queue));
  } catch {}
}

export async function getQueue(userId: string): Promise<UploadQueue | null> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return null;
    return JSON.parse(raw) as UploadQueue;
  } catch {
    return null;
  }
}

export async function markPhotoStatus(
  userId: string,
  uri: string,
  status: QueuedPhoto['status'],
): Promise<void> {
  try {
    const queue = await getQueue(userId);
    if (!queue) return;
    const updated: UploadQueue = {
      ...queue,
      photos: queue.photos.map(p => (p.uri === uri ? { ...p, status } : p)),
    };
    await saveQueue(userId, updated);
  } catch {}
}

export async function clearQueue(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(userId));
  } catch {}
}

export async function hasUnfinishedQueue(userId: string): Promise<boolean> {
  try {
    const queue = await getQueue(userId);
    if (!queue) return false;
    return queue.photos.some(p => p.status === 'pending');
  } catch {
    return false;
  }
}

export async function resumeQueue(
  userId: string,
  opts?: { onProgress?: (done: number, total: number) => void },
): Promise<{ uploaded: number; total: number; failed: number }> {
  const { uploadGalleryPhoto } = await import('./galleries');
  const queue = await getQueue(userId);
  const pending = queue ? queue.photos.filter(p => p.status === 'pending') : [];
  const total = pending.length;
  if (!queue || total === 0) return { uploaded: 0, total: 0, failed: 0 };

  let uploaded = 0;
  let failed = 0;

  for (const photo of pending) {
    try {
      await uploadGalleryPhoto({
        galleryId: queue.galleryId,
        uri: photo.uri,
        mimeType: photo.mimeType,
        width: photo.width,
        height: photo.height,
      });
      await markPhotoStatus(userId, photo.uri, 'done');
      uploaded++;
      opts?.onProgress?.(uploaded + failed, total);
    } catch (err: any) {
      if (err?.message === 'GALLERY_FULL') break;
      await markPhotoStatus(userId, photo.uri, 'failed');
      failed++;
      opts?.onProgress?.(uploaded + failed, total);
    }
  }

  await clearQueue(userId);
  return { uploaded, total, failed };
}
