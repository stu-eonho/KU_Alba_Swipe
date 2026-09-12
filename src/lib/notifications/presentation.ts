/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 알림 한 건을 "어떻게 보여줄지"로 옮기는 순수 함수입니다.
 * JSX 도 lucide 아이콘도 돌려주지 않습니다 — 그건 B 영역이고, 여기서 돌려주면
 * 데이터 계층이 화면 구현에 묶입니다.
 *
 *   const view = presentNotification(item, user.role);
 *   view.label        종류 라벨 ("지원 접수", "매칭")
 *   view.tone         색 계열. B 가 아이콘 타일과 라벨 색에 매핑합니다
 *   view.displayTitle 정규화된 제목 (옛 문구를 새 문구로 바꾼 뒤)
 *   view.storeName    관련 공고명. 없으면 null
 *   view.destination  눌렀을 때 갈 곳. null 이면 유효한 대상이 없습니다
 *
 * CRITICAL: destination 이 null 인 알림은 읽음 처리하지 마세요.
 * 스펙대로 토스트만 띄우고 안 읽음을 남깁니다 — 열어 본 적이 없으니까요.
 */
import type { NotificationItem, NotificationType, UserRole } from '@/types';

/** B 가 아이콘 타일 배경과 라벨 색을 고를 때 쓰는 계열 */
export type NotificationTone = 'brand' | 'like' | 'nope' | 'info' | 'neutral';

export type NotificationView = {
  label: string;
  tone: NotificationTone;
  displayTitle: string;
  body: string;
  storeName: string | null;
  /** react-router 경로. null 이면 열 수 있는 화면이 없습니다 */
  destination: string | null;
};

const LABELS: Record<NotificationType, string> = {
  application_received: '지원 접수',
  application_viewed: '열람',
  application_accepted: '관심',
  application_rejected: '지원 종료',
  employer_interested: '관심',
  mutual_match: '매칭',
  system: '안내',
};

const TONES: Record<NotificationType, NotificationTone> = {
  application_received: 'info',
  application_viewed: 'neutral',
  application_accepted: 'like',
  application_rejected: 'nope',
  employer_interested: 'brand',
  mutual_match: 'brand',
  system: 'neutral',
};

/**
 * "채용" 표현을 "관심"으로 옮깁니다.
 *
 * DB 에 이미 쌓인 알림의 title·body 는 trigger 가 쓴 옛 문구 그대로입니다.
 * 행을 고쳐 쓰면 dedupe_key 와 읽음 상태가 얽히므로, 읽는 쪽에서 정규화합니다.
 * 새 알림은 애초에 새 문구로 들어옵니다.
 */
const TEXT_REWRITES: Array<[from: RegExp, to: string]> = [
  [/채용이 확정됐어요/g, '관심을 보냈어요'],
  [/회원님을 채용했어요/g, '회원님께 관심을 보냈어요'],
  [/채용 확정/g, '관심'],
  [/이번 채용은/g, '이번 지원은'],
];

function normalize(text: string): string {
  return TEXT_REWRITES.reduce((acc, [from, to]) => acc.replace(from, to), text);
}

/**
 * 눌렀을 때 갈 곳.
 *
 * 연결된 대상이 지워졌으면 null 입니다 — 알림은 남아 있는데 공고나 지원서가
 * 사라진 경우입니다. 그때 빈 화면으로 보내는 대신 아무 데도 안 보냅니다.
 */
function destinationOf(item: NotificationItem, role: UserRole): string | null {
  if (item.type === 'mutual_match') {
    const counterpartId = item.payload?.counterpartId;
    // 매칭 시트는 상대 id 가 있어야 연락처를 물어볼 수 있습니다.
    return typeof counterpartId === 'string' && counterpartId
      ? `/notifications?match=${counterpartId}`
      : null;
  }

  if (role === 'employer') {
    // 구인자는 지원자 목록에서 확인합니다. 지원서 단건 화면은 구직자 것입니다.
    return item.applicationId ? `/employer/applicants?applicationId=${item.applicationId}` : null;
  }

  if (item.type === 'employer_interested') {
    return item.applicationId ? '/settings/applications' : null;
  }

  return item.applicationId ? `/settings/applications/${item.applicationId}` : null;
}

export function presentNotification(item: NotificationItem, role: UserRole): NotificationView {
  return {
    label: LABELS[item.type] ?? '안내',
    tone: TONES[item.type] ?? 'neutral',
    displayTitle: normalize(item.title),
    body: normalize(item.body),
    storeName: item.job?.storeName ?? null,
    destination: destinationOf(item, role),
  };
}
