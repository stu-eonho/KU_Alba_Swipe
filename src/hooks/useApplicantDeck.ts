/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 구인자가 넘겨 볼 지원자 덱.
 *
 *   const { applicants, isLoading, isError, retry, offer, hiddenCount } = useApplicantDeck();
 *   offer(seeker.id, 'right', entry.job.id);   // 관심 있어요 → trigger 가 알림 생성
 *   offer(seeker.id, 'left',  entry.job.id);   // 관심 없음
 *
 * 보류 탭은 없앴습니다. left 행은 그대로 남겨 두므로 한 번 넘긴 지원자는
 * 다시 뜨지 않습니다 — 되살리는 화면만 사라진 것이고 데이터는 그대로입니다.
 *
 * 덱 원소는 ApplicantEntry 그대로입니다. 사장님은 "지원자"가 아니라
 * "내 공고에 지원한 사람"을 보는 것이고, 지원 공고·메시지가 카드에 필요합니다.
 *
 * offer() 는 낙관적입니다. 응답을 기다리지 않고 이 훅이 덱에서 빼므로
 * B 는 카드 날리는 애니메이션만 하면 됩니다 — 공고 덱과 같은 계약입니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEmployerApplicants } from '@/lib/api/applications';
import { createOffer, fetchMyOffers } from '@/lib/api/offers';
import { useAuth } from '@/lib/auth-context';
import type { ApplicantEntry, Offer, OfferDirection } from '@/types';

const APPLICANTS_KEY = ['applications', 'employer', 'all'];
const OFFERS_KEY = ['offers', 'mine'];

/** 지원자와 판단 기록을 각각 읽어 옵니다. 둘 사이에 FK 가 없어 조인은 여기서 합니다. */
function useEmployerSources() {
  const { user } = useAuth();
  const enabled = Boolean(user) && user?.role === 'employer';

  const applicants = useQuery({
    queryKey: APPLICANTS_KEY,
    queryFn: () => fetchEmployerApplicants(),
    enabled,
  });

  const offers = useQuery({
    queryKey: OFFERS_KEY,
    queryFn: fetchMyOffers,
    enabled,
  });

  return { applicants, offers };
}

/** 같은 사람이 여러 공고에 지원했을 수 있어, 덱에는 사람당 1장만 올립니다. */
function dedupeBySeeker(entries: ApplicantEntry[]): ApplicantEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.seeker.id)) return false;
    seen.add(entry.seeker.id);
    return true;
  });
}

/** 판단 기록 쓰기. */
function useOffer() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      seekerId,
      direction,
      jobId,
    }: {
      seekerId: string;
      direction: OfferDirection;
      jobId?: string | null;
    }) => createOffer(seekerId, direction, jobId),

    onMutate: async ({ seekerId, direction, jobId }) => {
      await queryClient.cancelQueries({ queryKey: OFFERS_KEY });
      const previous = queryClient.getQueryData<Offer[]>(OFFERS_KEY);

      // 판단 기록을 먼저 넣으면 위의 filter 가 그 사람을 덱에서 바로 뺍니다.
      queryClient.setQueryData<Offer[]>(OFFERS_KEY, (list) => {
        const rest = (list ?? []).filter((offer) => offer.seekerId !== seekerId);
        return [
          {
            employerId: '',
            seekerId,
            jobId: jobId ?? null,
            direction,
            createdAt: new Date().toISOString(),
          },
          ...rest,
        ];
      });

      return { previous };
    },

    onError: (error, _variables, context) => {
      console.error('[applicant-deck] 저장 실패:', error);
      if (context?.previous) queryClient.setQueryData(OFFERS_KEY, context.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
      // right 면 trigger 가 알림을 만듭니다. 방금 생긴 것을 보려면 다시 물어봐야 합니다.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const offer = useCallback(
    (seekerId: string, direction: OfferDirection, jobId?: string | null) => {
      mutation.mutate({ seekerId, direction, jobId });
    },
    [mutation],
  );

  return { offer, offerError: mutation.error };
}

export function useApplicantDeck() {
  const { applicants, offers } = useEmployerSources();
  const { offer, offerError } = useOffer();

  // 이미 판단한 사람은 덱에서 뺍니다 (관심 없음이든 관심 있음이든).
  const judged = new Set((offers.data ?? []).map((entry) => entry.seekerId));
  const pending = dedupeBySeeker(applicants.data ?? []).filter(
    (entry) => !judged.has(entry.seeker.id),
  );

  return {
    applicants: pending,
    isLoading: applicants.isLoading || offers.isLoading,
    isError: applicants.isError || offers.isError,
    retry: () => {
      void applicants.refetch();
      void offers.refetch();
    },
    offer,
    offerError,
    /** 관심 없음으로 넘긴 인원수 */
    hiddenCount: (offers.data ?? []).filter((entry) => entry.direction === 'left').length,
  };
}
