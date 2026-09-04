// 항목의 태그 편집·이름 바꾸기 프롬프트 (컨텍스트 메뉴에서 온다).
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';
import { findItem, type Item } from '../../stores/items';
import { promptDialog } from './actions';

export async function promptTags(ids: readonly string[]): Promise<void> {
  const items = ids.map(findItem).filter((i): i is Item => i !== undefined);
  const head = items[0];
  if (!head) return;
  const common = items.length === 1 ? head.tags : items.reduce<string[]>((acc, it) => acc.filter((x) => it.tags.includes(x)), head.tags);
  const r = await promptDialog({
    title: items.length > 1 ? t('prompt.tags_n', { n: items.length }) : t('prompt.tags'),
    desc: t('prompt.tags_desc'),
    fields: [{ value: common.join(', '), placeholder: t('prompt.tags_ph') }],
  });
  const raw = r?.[0];
  if (raw === undefined) return;
  const tags = [
    ...new Set(
      raw
        .split(/[,\s]+/)
        .map((x) => x.replace(/^#/, '').trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
  for (const it of items) {
    // 여러 개를 한 번에 고칠 때는 공통 태그만 바꾸고 각자 따로 가진 태그는 남긴다.
    const merged = items.length > 1 ? [...new Set([...it.tags.filter((x) => !common.includes(x)), ...tags])] : tags;
    await api.updateItem(it.id, { tags: merged });
  }
}

export async function promptRename(id: string): Promise<void> {
  const it = findItem(id);
  if (!it) return;
  const r = await promptDialog({ title: t('prompt.rename'), fields: [{ value: it.title }] });
  const v = r?.[0];
  if (v !== undefined) await api.updateItem(id, { title: v.trim() });
}
