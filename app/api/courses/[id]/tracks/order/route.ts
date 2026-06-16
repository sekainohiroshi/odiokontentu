import { getSupabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    const { ids } = await request.json();
    const sb = getSupabase();
    await Promise.all((ids as string[]).map((id, i) =>
      sb.from('tracks').update({ order: i }).eq('id', id)
    ));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
