import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

// CRITICAL: must match the server's public.get_contact_hash_salt() value.
// If this is ever changed, update the SQL function AND re-sync profiles.phone_hash.
const CONTACT_HASH_SALT = 'momento-contact-salt-v1';

const MAX_CONTACTS_TO_HASH = 2000;

// Used to prefix bare 10-digit numbers when the user is in North America.
// Eventually move this to a user-configurable setting based on profile country.
const DEFAULT_COUNTRY_CODE = '+1';

export type MatchedContact = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  contactName: string;
};

export type UnmatchedContact = {
  contactName: string;
  phoneE164: string;
};

export type ContactSyncResult = {
  matched: MatchedContact[];
  unmatched: UnmatchedContact[];
  totalContactsScanned: number;
  permissionGranted: boolean;
};

export async function requestContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function hasContactsPermission(): Promise<boolean> {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export function normalizePhoneToE164(
  raw: string,
  defaultCountryCode = DEFAULT_COUNTRY_CODE,
): string | null {
  // Keep only digits and a leading '+'
  const stripped = raw.replace(/(?!^\+)[^\d]/g, '');
  if (!stripped) return null;

  if (stripped.startsWith('+')) return stripped;

  const digits = stripped.replace(/\D/g, '');
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export async function hashPhoneE164(e164: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    CONTACT_HASH_SALT + e164,
  );
}

export async function syncContacts(): Promise<ContactSyncResult> {
  const permissionGranted = await hasContactsPermission();
  if (!permissionGranted) {
    return { matched: [], unmatched: [], totalContactsScanned: 0, permissionGranted: false };
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Name,
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
    ],
  });

  const totalContactsScanned = data.length;

  // Flatten contacts → { contactName, phoneE164 }, capped at MAX_CONTACTS_TO_HASH
  const candidates: { contactName: string; phoneE164: string }[] = [];
  for (const contact of data) {
    if (candidates.length >= MAX_CONTACTS_TO_HASH) break;
    if (!contact.phoneNumbers?.length) continue;

    const contactName =
      contact.name?.trim() ||
      `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() ||
      'Unknown';

    for (const entry of contact.phoneNumbers) {
      if (candidates.length >= MAX_CONTACTS_TO_HASH) break;
      const e164 = entry.number ? normalizePhoneToE164(entry.number) : null;
      if (e164) candidates.push({ contactName, phoneE164: e164 });
    }
  }

  // Hash all phones in parallel, then de-duplicate
  const hashes = await Promise.all(candidates.map(c => hashPhoneE164(c.phoneE164)));

  // Map<hash, first candidate> — keeps first occurrence on collision
  const hashToCandidate = new Map<string, { contactName: string; phoneE164: string }>();
  for (let i = 0; i < hashes.length; i++) {
    if (!hashToCandidate.has(hashes[i])) {
      hashToCandidate.set(hashes[i], candidates[i]);
    }
  }

  const dedupedHashes = Array.from(hashToCandidate.keys());

  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    'match_contacts_by_phone_hashes',
    { hashes: dedupedHashes },
  );

  if (rpcError) {
    return { matched: [], unmatched: [], totalContactsScanned, permissionGranted: true };
  }

  const rows = (rpcRows ?? []) as Array<{
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    phone_hash: string;
  }>;

  const matchedHashes = new Set(rows.map(r => r.phone_hash));

  const matched: MatchedContact[] = rows.map(row => ({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    contactName: hashToCandidate.get(row.phone_hash)?.contactName ?? 'Unknown',
  }));

  const unmatched: UnmatchedContact[] = dedupedHashes
    .filter(h => !matchedHashes.has(h))
    .map(h => {
      const c = hashToCandidate.get(h)!;
      return { contactName: c.contactName, phoneE164: c.phoneE164 };
    });

  return { matched, unmatched, totalContactsScanned, permissionGranted: true };
}
