export type GalleryPrivacy = 'private' | 'friends' | 'public';

export interface Gallery {
  id: string;
  title: string;
  privacy: GalleryPrivacy;
  cover_photo_url: string | null;
  created_at: string;
  created_by: string;
  pinned?: boolean;
  role?: 'owner' | 'member';
}

export interface GalleryMember {
  gallery_id: string;
  user_id: string;
  role: string;
  invited_at: string;
}

export interface Photo {
  id: string;
  gallery_id: string;
  storage_path: string;
  url: string;
  uploaded_by: string;
  created_at: string;
}
