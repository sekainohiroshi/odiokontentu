import { getSupabase, mapTrack, storagePathFromUrl } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    const body = await request.json();
    const sb = getSupabase();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.blobUrl !== undefined) {
      const { data: old } = await sb
        .from('tracks')
        .select('blob_url')
        .eq('id', trackId)
        .single();
      if (old?.blob_url && old.blob_url !== body.blobUrl) {
        const p = storagePathFromUrl(old.blob_url as string);
        if (p) await sb.storage.from('audio').remove([p]).catch(() => {});
      }
      updates.blob_url = body.blobUrl;
    }

    const { data, error } = await sb
      .from('tracks')
      .update(updates)
      .eq('id', trackId)
      .select()
      .single();
    if (error) throw error;
    return Response.json(mapTrack(data));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    const sb = getSupabase();
    const { data: track } = await sb
      .from('tracks')
      .select('blob_url')
      .eq('id', trackId)
      .single();
    if (track?.blob_url) {
      const p = storagePathFromUrl(track.blob_url as string);
      if (p) await sb.storage.from('audio').remove([p]).catch(() => {});
    }
    const { error } = await sb.from('tracks').delete().eq('id', trackId);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
