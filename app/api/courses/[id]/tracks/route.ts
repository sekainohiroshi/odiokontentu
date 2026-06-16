import { getSupabase, mapTrack } from '@/lib/supabase';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await getSupabase()
      .from('tracks')
      .select('*')
      .eq('course_id', id)
      .order('order');
    if (error) throw error;
    return Response.json((data ?? []).map(mapTrack));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const { title, blobUrl } = await request.json();
    if (!blobUrl) return Response.json({ error: 'blobUrl が必要です' }, { status: 400 });

    const sb = getSupabase();
    const { data: existing } = await sb
      .from('tracks')
      .select('id')
      .eq('course_id', courseId)
      .eq('title', title)
      .maybeSingle();

    if (existing) {
      const { data, error } = await sb
        .from('tracks')
        .update({ blob_url: blobUrl })
        .eq('id', (existing as { id: string }).id)
        .select()
        .single();
      if (error) throw error;
      return Response.json(mapTrack(data));
    }

    const { count } = await sb
      .from('tracks')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);
    const { data, error } = await sb
      .from('tracks')
      .insert({ course_id: courseId, title, blob_url: blobUrl, order: count ?? 0 })
      .select()
      .single();
    if (error) throw error;
    return Response.json(mapTrack(data));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
