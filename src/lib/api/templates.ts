/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 지원서 템플릿. 같은 문장을 매번 다시 쓰지 않게 저장해 두고 꺼내 씁니다.
 * RLS 가 본인 것만 보여주므로 여기서 user_id 조건을 따로 걸지 않습니다.
 */
import { supabase } from '@/lib/supabase';

export type ApplyTemplate = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type TemplateRow = { id: string; title: string; body: string; created_at: string };

function toTemplate(row: TemplateRow): ApplyTemplate {
  return { id: row.id, title: row.title, body: row.body, createdAt: row.created_at };
}

/** 최신순. */
export async function fetchApplyTemplates(): Promise<ApplyTemplate[]> {
  const { data, error } = await supabase
    .from('apply_templates')
    .select('id, title, body, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as TemplateRow[]).map(toTemplate);
}

/**
 * 새 템플릿 저장.
 * user_id 는 컬럼 default 가 auth.uid() 이므로 보내지 않습니다.
 */
export async function createApplyTemplate(title: string, body: string): Promise<ApplyTemplate> {
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error('빈 내용은 저장할 수 없어요');

  const { data, error } = await supabase
    .from('apply_templates')
    // 제목이 비면 본문 앞부분을 제목으로 씁니다. 제목 입력을 강제하면
    // "저장" 한 번 하려고 시트를 한 단계 더 거쳐야 합니다.
    .insert({ title: title.trim() || trimmedBody.slice(0, 20), body: trimmedBody })
    .select()
    .single();
  if (error) throw error;

  return toTemplate(data as TemplateRow);
}

export async function deleteApplyTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('apply_templates').delete().eq('id', id);
  if (error) throw error;
}
