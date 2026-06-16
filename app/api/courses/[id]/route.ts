import { getSupabase, mapCourse, storagePathFromUrl } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await request.json();
    const { data, error } = await getSupabase()
      .from('courses')
      .update({ name })
      .eq('id', id)
      .select('*, tracks(*)')
      .single();
    if (error) throw error;
    return Response.json(mapCourse(data));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sb = getSupabase();
    const { data: tracks } = await sb
      .from('tracks')
      .select('blob_url')
      .eq('course_id', id);
    const paths = (tracks ?? [])
      .map((t: { blob_url: string }) => storagePathFromUrl(t.blob_url))
      .filter((p): p is string => !!p);
    if (paths.length) await sb.storage.from('audio').remove(paths).catch(() => {});
    const { error } = await sb.from('courses').delete().eq('id', id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
