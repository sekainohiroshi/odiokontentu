import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL と SUPABASE_ANON_KEY が未設定です');
  return createClient(url, key);
}

export function storagePathFromUrl(url: string): string | null {
  const base = `${process.env.SUPABASE_URL}/storage/v1/object/public/audio/`;
  return url.startsWith(base) ? url.slice(base.length) : null;
}

export function mapTrack(t: Record<string, unknown>) {
  return {
    id: t.id as string,
    title: t.title as string,
    blobUrl: t.blob_url as string,
    order: t.order as number,
  };
}

export function mapCourse(c: Record<string, unknown>) {
  const tracks = (c.tracks as Record<string, unknown>[]) || [];
  return {
    id: c.id as string,
    name: c.name as string,
    order: c.order as number,
    tracks: tracks.map(mapTrack),
  };
}
