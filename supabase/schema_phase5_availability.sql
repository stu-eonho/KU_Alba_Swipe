-- 같은 요일에 떨어진 시간대 여러 개를 저장할 수 있게 한다
--
-- 증상: 시간표에서 수요일 10-11시와 16-17시를 따로 칠하고 저장하면
--       10-17시 한 덩어리로 합쳐진다.
--
-- 원인: user_availability 의 기본키가 (user_id, day) 라 **하루에 한 줄**만 들어간다.
--       같은 요일로 두 줄을 upsert 하면 Postgres 가
--       "ON CONFLICT DO UPDATE cannot affect row a second time" 로 저장 전체를 실패시킨다.
--       그래서 앱이 요일당 min(start)~max(end) 로 감싸는 우회를 하고 있었다.
--
-- 수정: 기본키에 start_min 을 넣는다. 떨어진 구간은 시작 시각이 다르므로
--       (user_id, day, start_min) 이면 충돌하지 않는다.
--       새 컬럼을 만들지 않아 기존 데이터가 그대로 살아 있다.
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. 10초면 끝난다.

alter table user_availability drop constraint if exists user_availability_pkey;
alter table user_availability add primary key (user_id, day, start_min);


-- 확인 — 아래가 (user_id, day, start_min) 세 컬럼을 보여야 한다
select
  a.attname as "기본키_컬럼"
from pg_index i
join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
where i.indrelid = 'user_availability'::regclass
  and i.indisprimary;
