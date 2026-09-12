/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * 튜토리얼 4장의 내용. 제목은 PHASE2_PLAN.md B-4 에 적힌 문구 그대로,
 * 설명 한 줄은 스펙 미기재라 임의 작성했다(_workspace/06 참조).
 *
 * 그림 파일을 만들 수 없으므로 일러스트는 lucide 아이콘 + 토큰 색으로 대신한다.
 * 아이콘은 전부 text-ink 다 — Blind 시스템에서 레드는 CTA 전용이라
 * "찜" 장이라고 해서 아이콘을 빨갛게 칠하지 않는다.
 */
import { FileText, Heart, LayoutGrid, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TutorialSlide = {
  id: string;
  Icon: LucideIcon;
  title: string;
  body: string;
};

export const TUTORIAL_SLIDES: readonly TutorialSlide[] = [
  {
    id: 'like',
    Icon: Heart,
    title: '오른쪽으로 넘기면 찜',
    body: '마음에 드는 공고는 카드를 오른쪽으로 미세요.\n찜 목록에 바로 담깁니다.',
  },
  {
    id: 'nope',
    Icon: X,
    title: '왼쪽으로 넘기면 관심 없음',
    body: '조건이 안 맞으면 왼쪽으로 미세요.\n다음 공고가 곧바로 올라옵니다.',
  },
  {
    id: 'compare',
    Icon: LayoutGrid,
    title: '찜 목록에서 한눈에 비교',
    body: '찜한 공고를 4개씩 나란히 놓고\n시급과 직종을 비교할 수 있습니다.',
  },
  {
    id: 'detail',
    Icon: FileText,
    title: '카드를 탭하면 상세보기',
    body: '리뷰·주소·근무조건을 확인하고\n그 자리에서 지원하세요.',
  },
] as const;
