/** 필수 라벨의 시각 표시와 스크린리더 문구를 한 벌로 유지한다. */
export function RequiredMark() {
  return (
    <>
      <span className="text-error ml-1" aria-hidden>
        *
      </span>
      <span className="sr-only"> (필수)</span>
    </>
  );
}
