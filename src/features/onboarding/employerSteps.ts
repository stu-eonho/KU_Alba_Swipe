/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE7_PLAN.md F9 · 구인자 인터랙티브 튜토리얼의 단계 정의.
 *
 * 구인자의 첫 화면은 `/employer/applicants` 다. 구직자 덱('/')용 단계를 그대로 쓰면
 * 앵커가 하나도 안 잡혀 스포트라이트 없는 설명만 나온다. 그래서 배열만 따로 둔다.
 * **엔진(InteractiveTutorial · useAnchorRect · SilentBoundary)은 구직자와 한 벌을 쓴다.**
 *
 * 앵커(`data-tour`):
 *   applicant-deck — ApplicantDeck 의 카드 스택 영역 전체(카드 개별이 아니다)
 *   tab-jobs       — BottomTabBar 의 내 공고 탭
 * 앵커를 못 찾으면 스포트라이트 없이 설명 카드만 뜬다(useAnchorRect). 절대 깨지지 않는다.
 */
import { UserX, BriefcaseBusiness, Heart, UsersRound } from 'lucide-react';
import type { TutorialStep } from './tutorialSteps';
import type { TutorialSlide } from './tutorialSlides';

export const EMPLOYER_STEPS: readonly TutorialStep[] = [
  {
    id: 'employer-deck',
    anchor: 'applicant-deck',
    title: '지원자가 카드로 옵니다',
    body: '내 공고에 지원한 사람이 한 장씩 올라와요.\n카드에 경력과 가능한 시간이 담겨 있습니다.',
    padding: 6,
    radius: 14,
  },
  {
    id: 'employer-interested',
    anchor: 'applicant-deck',
    title: '오른쪽으로 밀면 관심 있어요',
    body: '카드를 오른쪽으로 밀어보세요.\n지원자에게 바로 알림이 갑니다.',
    // 실제 스와이프면 자동 진행하고, 지원자가 없어도 "다음"을 즉시 눌러 진행할 수 있다.
    waitFor: 'right',
    padding: 6,
    radius: 14,
  },
  {
    id: 'employer-jobs',
    anchor: 'tab-jobs',
    title: '공고는 여기서 직접 올려요',
    body: '내 공고 탭에서 새 공고를 등록하고\n지원 현황을 확인하세요.',
    padding: 4,
    radius: 12,
  },
  {
    id: 'employer-done',
    anchor: null,
    title: '준비 끝!',
    body: '이제 지원자 카드를 넘기며\n함께 일할 사람을 찾아보세요.',
  },
] as const;

/**
 * 구인자용 폴백 슬라이드. 인터랙티브가 못 뜰 때(설정 > 다시 보기, 킬 스위치, 렌더 실패)
 * 구직자용 "오른쪽으로 넘기면 찜" 4장이 뜨면 구인자에게는 완전히 엉뚱한 안내가 된다.
 * 아이콘은 전부 text-ink 다 — 레드는 CTA 전용.
 */
export const EMPLOYER_SLIDES: readonly TutorialSlide[] = [
  {
    id: 'employer-applicants',
    Icon: UsersRound,
    title: '지원자가 카드로 옵니다',
    body: '내 공고에 지원한 사람이\n한 장씩 카드로 올라옵니다.',
  },
  {
    id: 'employer-right',
    Icon: Heart,
    title: '오른쪽으로 넘기면 관심 있어요',
    body: '함께 일하고 싶은 지원자는\n오른쪽으로 미세요. 바로 알림이 갑니다.',
  },
  {
    id: 'employer-left',
    Icon: UserX,
    title: '왼쪽으로 넘기면 관심 없음',
    body: '지금 조건이 맞지 않는 지원자는\n왼쪽으로 넘기면 목록에서 빠집니다.',
  },
  {
    id: 'employer-post',
    Icon: BriefcaseBusiness,
    title: '공고는 내 공고 탭에서',
    body: '새 공고를 직접 올리고\n지원 현황을 확인하세요.',
  },
] as const;
