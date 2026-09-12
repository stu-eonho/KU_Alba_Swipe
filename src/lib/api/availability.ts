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
/**
 * 가능 시간 전체 교체.
 *
 * upsert 가 아니라 **전부 지우고 새로 넣는다.** 같은 요일에 떨어진 구간이 둘 이상
 * 올 수 있는데, upsert(onConflict) 로는 Postgres 가 같은 행을 두 번 건드린다며
 * 저장 전체를 거부한다.
 *
 * 기본키가 (user_id, day) 에서 (user_id, day, start_min) 으로 바뀌어야 한 요일에
 * 여러 줄이 들어간다 — `supabase/schema_phase5_availability.sql`.
 *
 * CRITICAL: 그 SQL 을 아직 실행하지 않은 DB 에서도 저장이 깨지면 안 된다.
 * 배포가 마이그레이션보다 먼저 나갈 수 있기 때문이다. 유니크 위반(23505)이 나면
 * 요일당 한 구간으로 감싸 다시 시도한다. 정확도는 떨어지지만 저장은 성공한다.
 */
export async function replaceAvailability(
  userId: string,
  list: Availability[],
): Promise<Availability[]> {
  const { error: deleteError } = await supabase
    .from('user_availability')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (list.length === 0) return [];

  const toRows = (slots: Availability[]) =>
    slots.map((slot) => ({
      user_id: userId,
      day: slot.day,
      start_min: slot.startMin,
      end_min: slot.endMin,
    }));

  let { data, error } = await supabase.from('user_availability').insert(toRows(list)).select();

  if (error && error.code === '23505') {
    // 기본키가 아직 (user_id, day) 인 DB. 요일당 min~max 로 감싸 한 줄씩만 넣는다.
    const byDay = new Map<Weekday, { start: number; end: number }>();
    for (const slot of list) {
      const found = byDay.get(slot.day);
      if (!found) byDay.set(slot.day, { start: slot.startMin, end: slot.endMin });
      else {
        found.start = Math.min(found.start, slot.startMin);
        found.end = Math.max(found.end, slot.endMin);
      }
    }
    const merged: Availability[] = [...byDay.entries()].map(([day, range]) => ({
      day,
      startMin: range.start,
      endMin: range.end,
    }));
    ({ data, error } = await supabase.from('user_availability').insert(toRows(merged)).select());
  }

  if (error) throw error;

  return ((data ?? []) as AvailabilityRow[])
    .map(toAvailability)
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
}
