/**
 * OWNER: 개발자 B (screen-composer) — PHASE7 F6
 *
 * 공고 작성 폼에 끼우는 사진 첨부 한 칸. 폼은 A 소유라 이 컴포넌트는 값만 주고받습니다.
 *
 *   const [imageUrl, setImageUrl] = useState<string | null>(null);
 *   <JobImageField value={imageUrl} onChange={setImageUrl} />
 *
 * 업로드는 A의 useJobImageUpload 훅만 씁니다. supabase 를 직접 부르지 않습니다.
 *
 * 사진은 선택 항목입니다. job-images 버킷이 아직 없으면 upload 가 실패하는데,
 * 그때도 토스트만 뜨고 값은 null 로 남아 폼은 그대로 제출할 수 있습니다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { IconButton, Spinner, useToast } from '@/components/ui';
import { useJobImageUpload } from '@/hooks/useJobImageUpload';

const FALLBACK_ERROR = '사진을 올리지 못했어요. 다시 시도해 주세요';

/** 훅이 던지는 값이 Error 가 아닐 수도 있어(StorageError) message 를 방어적으로 꺼낸다. */
function messageOf(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export type JobImageFieldProps = {
  /** 현재 값. 아직 안 올렸으면 null */
  value: string | null;
  /** 업로드 성공 시 public URL, 삭제 시 null */
  onChange: (url: string | null) => void;
};

export function JobImageField({ value, onChange }: JobImageFieldProps) {
  const toast = useToast();
  const { upload, isUploading } = useJobImageUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // state 는 비동기라 해제 시점에 최신 값을 못 읽는다. 해제 대상은 ref 로 따로 들고 있는다.
  const objectUrlRef = useRef<string | null>(null);

  /** objectURL 교체·해제의 단일 통로. 새 URL 을 세우기 전에 이전 것을 반드시 revoke 한다. */
  const replaceObjectUrl = useCallback((next: string | null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = next;
    setPreviewUrl(next);
  }, []);

  // 업로드 도중 화면을 떠나도 blob 이 남지 않도록 언마운트에서 한 번 더 해제한다.
  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    [],
  );

  // 낙관적 미리보기가 있으면 그것을, 없으면 이미 올라간 사진을 보여준다.
  const shownUrl = previewUrl ?? value;

  const openPicker = () => inputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 골라도 change 가 또 발생하도록 값을 비운다.
    event.target.value = '';
    if (!file) return;

    replaceObjectUrl(URL.createObjectURL(file));
    try {
      const url = await upload(file);
      onChange(url);
    } catch (error) {
      // 5MB 초과·이미지 아님은 훅이 한국어 message 로 던진다. 그대로 보여준다.
      // 버킷이 없어 실패해도 여기서 끝난다 — 값은 그대로라 폼은 계속 쓸 수 있다.
      toast.error(messageOf(error, FALLBACK_ERROR));
    } finally {
      // 성공이면 서버 URL 로, 실패면 원래 상태로 돌아가며 blob 을 해제한다.
      replaceObjectUrl(null);
    }
  };

  const handleRemove = () => {
    replaceObjectUrl(null);
    onChange(null);
  };

  return (
    <div>
      <p className="mb-1 text-[13px] font-semibold text-muted">공고 사진</p>
      <p className="mb-2 text-[12px] text-faint">없어도 공고를 올릴 수 있어요</p>

      <div className="relative">
        {shownUrl ? (
          <button
            type="button"
            aria-label="공고 사진 변경"
            disabled={isUploading}
            onClick={openPicker}
            className="block aspect-[3/2] w-full overflow-hidden rounded-card border border-line bg-subtle"
          >
            <img src={shownUrl} alt="" className="size-full object-cover" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="공고 사진 추가"
            disabled={isUploading}
            onClick={openPicker}
            className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-line bg-subtle text-faint disabled:opacity-60"
          >
            <ImagePlus size={28} aria-hidden />
            <span className="text-[14px] font-semibold text-muted">공고 사진 추가</span>
            <span className="text-[12px] text-faint">최대 5MB</span>
          </button>
        )}

        {shownUrl && !isUploading && (
          <div className="absolute top-2 right-2">
            <IconButton label="사진 삭제" size={32} variant="scrim" onClick={handleRemove}>
              <X size={16} aria-hidden />
            </IconButton>
          </div>
        )}

        {isUploading && (
          <span className="bg-scrim absolute inset-0 grid place-items-center rounded-card text-white">
            <Spinner size={24} label="사진 올리는 중" />
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="공고 사진 추가"
        className="sr-only"
        disabled={isUploading}
        onChange={handleFileChange}
      />
    </div>
  );
}
