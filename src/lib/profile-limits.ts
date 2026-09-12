/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 프로필 입력 한도. 가입 화면과 프로필 편집 화면이 같은 값을 써야 합니다 —
 * 숫자를 양쪽에 적어 두면 한쪽만 늘렸을 때 가입에서 쓴 글이 편집 화면에서 잘립니다.
 *
 * DB 의 seeker_profiles.intro 는 text 라 길이 제한이 없습니다. 여기만 고치면 됩니다.
 */
export const MAX_INTRO_LENGTH = 1000;
