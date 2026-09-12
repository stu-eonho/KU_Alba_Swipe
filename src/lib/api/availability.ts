/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * user_availability 접근. 요일 하나당 행 하나입니다.
 */
import { supabase } from '@/lib/supabase';
import type { Availability, Weekday } from '@/types';

type AvailabilityRow = {
  user_id: string;
  day: Weekday;
  start_min: number;
  end_min: number;
};

const DAY_ORDER: Weekday[] = ['월', '화', '수', '목', '금', '토', '일'];

function toAvailability(row: AvailabilityRow): Availability {
  return { day: row.day, startMin: row.start_min, endMin: row.end_min };
}

/** 요일 순으로 정렬해 돌려줍니다. DB 정렬로는 한글 요일 순서가 나오지 않습니다. */
export async function fetchAvailability(userId: string): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('user_availability')
    .select('user_id, day, start_min, end_min')
    .eq('user_id', userId);
  if (error) throw error;

  return ((data ?? []) as AvailabilityRow[])
    .map(toAvailability)
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
}

/**
 * 전체 교체.
 *
 * 넘긴 목록에 없는 요일은 지웁니다. 화면에서 요일을 껐는데 DB 에 남아 있으면
 * 덱 필터가 계속 그 요일을 요구합니다.
 *
 * 트랜잭션이 아닙니다. 삭제와 삽입 사이에 실패하면 가능 시간이 빈 상태가 될 수 있는데,
 * 그 경우 필터가 꺼져 공고가 전부 보이는 쪽으로 떨어집니다 — 안전한 방향입니다.
 */
export async function replaceAvailability(
  userId: string,
  list: Availability[],
): Promise<Availability[]> {
  const keep = list.map((slot) => slot.day);

  let deletion = supabase.from('user_availability').delete().eq('user_id', userId);
  if (keep.length > 0) {
    // 남길 요일은 지우지 않고 아래 upsert 로 덮어씁니다.
    deletion = deletion.not('day', 'in', `(${keep.map((day) => `"${day}"`).join(',')})`);
  }
  const { error: deleteError } = await deletion;
  if (deleteError) throw deleteError;

  if (list.length === 0) return [];

  const { data, error } = await supabase
    .from('user_availability')
    .upsert(
      list.map((slot) => ({
        user_id: userId,
        day: slot.day,
        start_min: slot.startMin,
        end_min: slot.endMin,
      })),
      { onConflict: 'user_id,day' },
    )
    .select();
  if (error) throw error;

  return ((data ?? []) as AvailabilityRow[])
    .map(toAvailability)
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
}
