/**
 * OWNER: 개발자 B (디자인 시스템)
 *
 * 로그인·회원가입 공통 껍데기. 로고와 태그라인을 담고 있어
 * A 의 인증 로직이 아니라 디자인 시스템 쪽에 속한다.
 * `@/features/auth/form-primitives` 가 이것을 재export 하므로
 * A 의 기존 import 경로는 그대로 동작한다.
 */
import type React from 'react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center bg-app p-6">
      {/*
       * 로고 + 태그라인. 가운데 정렬이고 폼은 왼쪽 정렬인데, 라벨이 있는 폼은
       * 왼쪽 정렬이어야 읽히므로 인증 화면에서 흔한 조합이다.
       *
       * width/height 를 명시하는 이유: 이미지가 늦게 오면 아래 폼이 한 번 밀려
       * 올라간다. 비율(480x139)을 미리 알려 자리를 잡아 둔다.
       */}
      <header className="mb-9 flex flex-col items-center">
        <img
          src="/logo.png"
          alt="AlbaSwipe"
          width={180}
          height={52}
          className="h-[52px] w-[180px] object-contain"
        />
        <p className="mt-3 text-[14px] text-muted">스와이프해서 구인구직하기</p>
      </header>
      {children}
    </div>
  );
}
