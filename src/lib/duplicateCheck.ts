import { supabase } from './supabase';

export type PickedPhoto = {
  uri: string;
  mimeType?: string;
  assetId?: string | null;
  contentHash: string;
};

export type ClassifiedPhoto = PickedPhoto & {
  isDuplicate: boolean;
};

export type DuplicateClassification = {
  classified: ClassifiedPhoto[];
  duplicateCount: number;
  uniqueCount: number;
};

const GALLERY_ID_RE = /^[a-zA-Z0-9-]+$/;
const HASH_RE = /^[a-f0-9]{64}$/;

function validateInputs(galleryId: string, photos: PickedPhoto[]): void {
  if (!galleryId || !GALLERY_ID_RE.test(galleryId)) {
    throw new Error('Invalid galleryId');
  }
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 100) {
    throw new Error('Invalid photo input');
  }
  for (const photo of photos) {
    if (!photo.contentHash || !HASH_RE.test(photo.contentHash)) {
      throw new Error('Invalid photo input');
    }
  }
}

export async function classifyForDuplicates(
  galleryId: string,
  photos: PickedPhoto[]
): Promise<DuplicateClassification> {
  validateInputs(galleryId, photos);

  const inputHashes = [...new Set(photos.map(p => p.contentHash))];
  const inputAssetIds = [
    ...new Set(photos.map(p => p.assetId).filter((id): id is string => !!id)),
  ];

  const [hashQ, assetQ] = await Promise.all([
    inputHashes.length > 0
      ? supabase
          .from('gallery_photos')
          .select('content_hash')
          .eq('gallery_id', galleryId)
          .in('content_hash', inputHashes)
      : Promise.resolve({ data: [] as { content_hash: string }[], error: null }),
    inputAssetIds.length > 0
      ? supabase
          .from('gallery_photos')
          .select('source_asset_id')
          .eq('gallery_id', galleryId)
          .in('source_asset_id', inputAssetIds)
      : Promise.resolve({ data: [] as { source_asset_id: string }[], error: null }),
  ]);

  if (hashQ.error) {
    console.warn('duplicateCheck: hash query error', hashQ.error);
    throw hashQ.error;
  }
  if (assetQ.error) {
    console.warn('duplicateCheck: assetId query error', assetQ.error);
    throw assetQ.error;
  }

  const existingHashSet = new Set(
    (hashQ.data ?? []).map((r: { content_hash: string }) => r.content_hash)
  );
  const existingAssetIdSet = new Set(
    (assetQ.data ?? []).map((r: { source_asset_id: string }) => r.source_asset_id)
  );

  const seenHashes = new Set<string>();
  const seenAssetIds = new Set<string>();
  const classified: ClassifiedPhoto[] = [];

  for (const photo of photos) {
    const { contentHash, assetId } = photo;
    const safeAssetId = assetId && assetId.length > 0 ? assetId : null;
    let isDuplicate = false;

    if (existingHashSet.has(contentHash)) {
      isDuplicate = true;
    } else if (safeAssetId && existingAssetIdSet.has(safeAssetId)) {
      isDuplicate = true;
    } else if (seenHashes.has(contentHash) || (safeAssetId && seenAssetIds.has(safeAssetId))) {
      isDuplicate = true;
    } else {
      seenHashes.add(contentHash);
      if (safeAssetId) seenAssetIds.add(safeAssetId);
    }

    classified.push({ ...photo, isDuplicate });
  }

  const duplicateCount = classified.filter(p => p.isDuplicate).length;
  const uniqueCount = classified.length - duplicateCount;

  return { classified, duplicateCount, uniqueCount };
}
