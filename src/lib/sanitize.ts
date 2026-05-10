/**
 * Input sanitization and validation helpers.
 * The DB has CHECK constraints as a backstop, but catch errors client-side
 * first for better UX.
 */

const USERNAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;
const ZERO_WIDTH_CHARS = /[​-‍﻿]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Strip dangerous/invisible chars and trim. Use on every text input.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(ZERO_WIDTH_CHARS, '')
    .replace(CONTROL_CHARS, '')
    .trim();
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateUsername(input: string): ValidationResult {
  const clean = sanitizeText(input);
  if (clean.length < 2) return { ok: false, error: 'Username must be at least 2 characters' };
  if (clean.length > 30) return { ok: false, error: 'Username must be 30 characters or less' };
  if (!USERNAME_REGEX.test(clean)) {
    return { ok: false, error: 'Username can only contain letters, numbers, periods, underscores, and hyphens' };
  }
  return { ok: true };
}

export function validateDisplayName(input: string): ValidationResult {
  const clean = sanitizeText(input);
  if (clean.length < 1) return { ok: false, error: 'Display name cannot be empty' };
  if (clean.length > 50) return { ok: false, error: 'Display name must be 50 characters or less' };
  return { ok: true };
}

export function validateBio(input: string): ValidationResult {
  const clean = sanitizeText(input);
  if (clean.length > 300) return { ok: false, error: 'Bio must be 300 characters or less' };
  return { ok: true };
}

export function validateGalleryTitle(input: string): ValidationResult {
  const clean = sanitizeText(input);
  if (clean.length < 1) return { ok: false, error: 'Gallery title cannot be empty' };
  if (clean.length > 100) return { ok: false, error: 'Gallery title must be 100 characters or less' };
  return { ok: true };
}

export function validateComment(input: string): ValidationResult {
  const clean = sanitizeText(input);
  if (clean.length < 1) return { ok: false, error: 'Comment cannot be empty' };
  if (clean.length > 1000) return { ok: false, error: 'Comment must be 1000 characters or less' };
  return { ok: true };
}

export function validateMessage(input: string): ValidationResult {
  const clean = sanitizeText(input);
  if (clean.length > 2000) return { ok: false, error: 'Message must be 2000 characters or less' };
  return { ok: true };
}

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImageUpload(asset: { mimeType?: string | null; fileSize?: number | null }): ValidationResult {
  if (asset.mimeType && !ALLOWED_IMAGE_MIME.includes(asset.mimeType.toLowerCase())) {
    return { ok: false, error: 'Only JPG, PNG, WebP, and HEIC images are allowed' };
  }
  if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: 'Images must be 10MB or less' };
  }
  return { ok: true };
}
