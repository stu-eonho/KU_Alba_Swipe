/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 선호 가중치의 저장소. 계산은 lib/recommend.ts 가 하고 여기는 읽고 쓰기만 합니다.
 */
import { supabase } from '@/lib/supabase';
import type { Weights } from '@/lib/recommend';

type PreferencesRow = { user_id: string; weights: Weights | null };

/** 아직 학습된 게 없으면 빈 맵. 0건은 정상 상태라 maybeSingle() 을 씁니다. */
export async function fetchPreferences(userId: string): Promise<Weights> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('user_id, weights')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  return (data as PreferencesRow | null)?.weights ?? {};
}

export async function savePreferences(userId: string, weights: Weights): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: userId, weights, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}
