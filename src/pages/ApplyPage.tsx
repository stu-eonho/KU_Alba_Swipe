/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <apply_view>
 *
 * 자체 헤더를 만들지 않는다 — 라우터의 FullscreenLayout이 56px 탑바 + 뒤로가기 +
 * 중앙 "지원하기"를 이미 렌더한다. 여기서 또 만들면 탑바가 두 개가 된다.
 */
import { useParams } from 'react-router-dom';
import { ApplyForm } from '@/features/apply/ApplyForm';
import { NotFoundState, findMockJob } from '@/features/wishlist';

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  // TODO(통합): A의 공고 단건 조회 훅이 생기면 교체 (현재는 MOCK_JOBS에서 찾는다)
  const job = findMockJob(jobId);

  if (!job) {
    return <NotFoundState />;
  }

  return <ApplyForm job={job} />;
}
