type Privacy = 'private' | 'friends' | 'public';

interface GalleryDraft {
  title: string;
  privacy: Privacy | null;
}

let draft: GalleryDraft = { title: '', privacy: null };

export function getDraft(): GalleryDraft {
  return draft;
}

export function setDraft(updates: Partial<GalleryDraft>): void {
  draft = { ...draft, ...updates };
}

export function clearDraft(): void {
  draft = { title: '', privacy: null };
}
