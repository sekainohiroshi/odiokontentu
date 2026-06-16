import { getSupabase, mapCourse } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('courses')
      .select('*, tracks(*)')
      .order('order');
    if (error) throw error;
    return Response.json((data ?? []).map(mapCourse));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const sb = getSupabase();
    const { count } = await sb.from('courses').select('*', { count: 'exact', head: true });
    const { data, error } = await sb
      .from('courses')
      .insert({ name, order: count ?? 0 })
      .select('*, tracks(*)')
      .single();
    if (error) throw error;
    return Response.json(mapCourse(data));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
