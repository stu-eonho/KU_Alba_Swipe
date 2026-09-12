/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 최저시급. 공고 작성과 공고 수정이 같은 값을 봐야 합니다 —
 * 두 곳에 숫자를 적어 두면 한쪽만 올렸을 때 수정 화면으로는 최저임금 미만
 * 공고를 저장할 수 있게 됩니다.
 *
 * ⚠️ 연도가 바뀌면 이 상수와 DB 의 jobs_hourly_wage_min_2026 CHECK 를
 *    **함께** 올려야 합니다. 한쪽만 올리면 화면은 막는데 DB 가 통과시키거나,
 *    그 반대로 저장이 원인 모르게 실패합니다.
 */
export const MIN_HOURLY_WAGE = 10_320;
export const MIN_WAGE_YEAR = 2026;

export function minWageMessage(): string {
  return `${MIN_WAGE_YEAR}년 최저임금(${MIN_HOURLY_WAGE.toLocaleString()}원) 이상이어야 합니다`;
}
