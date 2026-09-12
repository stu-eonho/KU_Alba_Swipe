/**
 * OWNER: 개발자 A (데이터/인증) — PHASE6 A-2
 *
 * 사장님의 내 공고 목록. EmployerJobsPlaceholder 를 대신합니다.
 *
 * B: router.tsx 의 `/employer/jobs` 를 이 화면으로 바꾸고,
 *    `/employer/jobs/new` 에 EmployerJobFormPage 를 붙여 주세요.
 *    라우터는 B 소유라 A 가 건드리지 않았습니다.
 */
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useMyJobs, useUpdateJob } from '@/hooks/useEmployerJobs';
import { JobEditRow } from '@/features/employer/JobEditRow';

export default function EmployerJobsPage() {
  const { user } = useAuth();
  const { jobs, isLoading, isError, retry } = useMyJobs();
  const { updateJob, isUpdating } = useUpdateJob();

  // 라우터 가드가 막지만, 이 화면만 직접 열렸을 때도 터지지 않게 둡니다.
  if (!user || user.role !== 'employer') return null;

  return (
    <div className="tabbar-safe">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[15px] font-semibold text-ink">
          내 공고 <span className="tabular text-faint">{jobs.length}</span>
        </p>
        <Link
          to="/employer/jobs/new"
          className="flex h-11 items-center gap-1 rounded-field bg-brand px-3 text-[14px] font-semibold text-white"
        >
          <Plus size={16} aria-hidden />
          공고 작성
        </Link>
      </div>

      {isLoading && <p className="px-4 py-8 text-center text-[14px] text-faint">불러오는 중…</p>}

      {isError && (
        <div className="px-4 py-8 text-center">
          <p className="text-[14px] text-muted">공고를 불러오지 못했어요</p>
          <button
            type="button"
            onClick={() => void retry()}
            className="mt-3 h-11 rounded-field bg-subtle px-4 text-[14px] font-semibold text-muted"
          >
            다시 시도
          </button>
        </div>
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-[15px] font-semibold text-ink">아직 올린 공고가 없어요</p>
          <p className="mt-1 text-[13px] text-muted">
            공고를 올리면 조건이 맞는 구직자에게 노출됩니다.
          </p>
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <p className="px-4 pb-1 text-[12px] text-faint">공고를 누르면 바로 수정할 수 있어요</p>
          <ul>
            {jobs.map((job) => (
              <JobEditRow
                key={job.id}
                job={job}
                isSaving={isUpdating}
                onSave={(patch) => updateJob(job.id, patch)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
