import type { User } from '@supabase/supabase-js';

/** Display name from signup metadata, with email fallback. */
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) {
    return '';
  }

  const metadata = user.user_metadata ?? {};
  const fromMetadata =
    metadata.name ??
    metadata.user_name ??
    metadata.full_name ??
    metadata.display_name;

  if (typeof fromMetadata === 'string' && fromMetadata.trim()) {
    return fromMetadata.trim();
  }

  const emailPrefix = user.email?.split('@')[0];
  return emailPrefix?.trim() ?? '';
}
