# 개발자 A 작업 — Phase 6 (마감 20:50, 기능 동결 20:00)

B는 용어 변경·매칭 연결·튜토리얼·평점 UI를 맡습니다. **아래는 A 전용이고 B는 손대지 않습니다.**
위에서부터 하세요. 1번이 가장 오래 요청돼 온 미구현 기능입니다.

---

## A-1 · 자기소개 1000자 (5분) — 지금 바로

지금 500자입니다. `src/features/profile/ProfileEditor.tsx:160-163`의 `maxLength` · `slice(0, 500)` · `hint` 세 곳과, `SignupPage`의 자기소개 단계, `features/auth/validation.ts`에 길이 검증이 있으면 거기까지 **1000**으로.

DB는 `text`라 스키마 변경 없음.

---

## A-2 · 구인자 공고 작성 (1.5h) — 가장 큰 미구현 기능

지금 `/employer/jobs`가 `EmployerJobsPlaceholder`입니다. 사용자가 여러 번 요청했는데 계속 밀렸습니다.

### 스키마
```sql
create policy "employer creates jobs" on jobs for insert
  with check (auth.uid() = employer_id);
create policy "employer updates own jobs" on jobs for update
  using (auth.uid() = employer_id);
grant insert, update on jobs to authenticated;
```

### 화면 — `src/pages/EmployerJobFormPage.tsx` + `src/hooks/useCreateJob.ts`

필드: 상호명 · 업종(11종 Select) · 시급 · 한 줄 요약 · 상세 · 주소 · 근무 요일 · 근무 시간 · 복리후생(칩)

**⚠️ 포맷을 반드시 지켜야 합니다. 시간 겹침 판정이 이 문자열을 파싱합니다:**
- `work_days` = `"월·수·금"` — 가운뎃점(`·`) 구분, 공백 없음
- `work_hours` = `"13:00 ~ 18:00"` — **공백 포함 ` ~ `**

요일 토글과 time input에서 조립하되 **저장 직전에 형식을 검증**하세요. 틀리면 시간 필터가 조용히 실패합니다(에러 없이 그냥 안 걸러짐).

`employer_id`는 컬럼 default가 `auth.uid()`라 클라이언트가 보내지 않습니다.

`/employer/jobs`를 **내 공고 목록**으로 바꾸고 "+ 공고 작성" 버튼 → 이 폼.
`EmployerJobsPlaceholder`는 삭제.

---

## A-3 · 회원탈퇴 (40분)

설정 화면 맨 아래. `ConfirmDialog`로 한 번 확인 후 실행.

**Supabase는 클라이언트에서 자기 계정을 지울 수 없습니다.** anon key로는 `auth.admin.deleteUser`를 못 씁니다. 두 가지 중 고르세요:

**(권장) RPC로 처리** — `security definer` 함수를 만들어 본인만 자기 계정을 지우게:
```sql
create or replace function public.delete_own_account()
returns void language plpgsql security definer as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  -- 연결 데이터는 on delete cascade 로 함께 지워진다
  delete from auth.users where id = auth.uid();
end $$;
grant execute on function public.delete_own_account() to authenticated;
```
클라이언트: `supabase.rpc('delete_own_account')` → `signOut()` → `/login`.

**(대안) 소프트 삭제** — `auth.users`를 못 건드리면 `seeker_profiles`·`swipes`·`applications`·`offers`·`user_availability`를 지우고 로그아웃만. 계정은 남지만 데모에서는 구분이 안 됩니다.

지운 뒤 토스트 "탈퇴가 완료됐어요" + 로그인 화면으로.

---

## A-4 · 사진 업로드 — 데이터 쪽 (45분)

B가 UI를 맡습니다. A는 Storage와 훅만.

1. Supabase 대시보드 → Storage → 버킷 `avatars` 생성, **public 체크**
2. 정책:
```sql
create policy "own avatar upload" on storage.objects for insert
  to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own avatar update" on storage.objects for update
  to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars are public" on storage.objects for select
  using (bucket_id = 'avatars');
```
경로 규칙: `avatars/{user_id}/avatar.jpg` — 폴더 첫 조각이 uid라 남의 파일에 못 씁니다.

3. `src/hooks/useAvatarUpload.ts`
```ts
const { upload, isUploading } = useAvatarUpload();
// upload(file: File) => Promise<string>   업로드 후 public URL 반환
// 업로드 성공 시 seeker_profiles.avatar_url 에 저장까지
```
**5MB 초과나 image/* 아닌 파일은 훅에서 거부**하고 에러를 던지세요. B가 토스트로 보여줍니다.

완료되면 **즉시 B에게 알리세요.** B가 UI를 붙입니다.

---

## A-5 · 구직자 평점 + 공고 "원하는 성격" (40분) — 시간 남으면

```sql
create table if not exists seeker_ratings (
  employer_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  seeker_id   uuid not null references auth.users(id) on delete cascade,
  score       integer not null check (score between 1 and 5),
  created_at  timestamptz default now(),
  primary key (employer_id, seeker_id)
);
alter table seeker_ratings enable row level security;
create policy "employer rates applicant" on seeker_ratings for all
  using (auth.uid() = employer_id) with check (auth.uid() = employer_id);
create policy "read ratings" on seeker_ratings for select using (auth.uid() is not null);
grant select, insert, update on seeker_ratings to authenticated;

alter table jobs add column if not exists wanted_traits text[] default '{}';
```

`types.ts`의 `Job`에 `wantedTraits: string[]` 추가 → **단독 커밋 + `contract:` 접두사 + 즉시 공지** (B가 표시합니다).
값은 **기존 `PERSONALITY_TRAITS` 상수를 그대로 재사용**하세요. 새 목록을 만들면 구직자 프로필과 어휘가 갈립니다.

`src/hooks/useSeekerRating.ts` → `{ avg, count, myScore, rate(score) }`
공고 작성 폼(A-2)에 "이런 분을 찾아요" 칩 다중 선택 추가.

---

## 공통 규칙

- 브랜치 `a/phase6`, 머지 조건은 `npm run build` 통과
- **B 소유 경로 금지**: `src/components/` · `src/styles/` · `router.tsx` · `src/features/{deck,wishlist,apply,onboarding,availability,employer-deck,employer-ui,notifications,profile}/` · `src/pages/{HomeDeck,Wishlist,Apply,EmployerHeld,EmployerApplicants,Settings}Page.tsx`
- `src/types.ts`는 공동 — 단독 커밋 + 공지
- hex 리터럴 금지(토큰만) · 타이포 최대 18px/600 · 그림자 금지 · 입력 폰트 16px 이상
