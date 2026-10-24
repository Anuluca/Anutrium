import { type FloraMedia, getFloraCaptureDate } from './floratriumMedia'

export const floraAlbumTags = [
  { id: 'all', zhCn: '全部', en: 'ALL' },
  { id: 'CLOSEUP', zhCn: '特写', en: 'CLOSEUP' },
  { id: 'SLEEP', zhCn: '睡觉', en: 'SLEEP' },
  { id: 'MEME', zhCn: 'MEME', en: 'MEME' },
  { id: 'BALL', zhCn: '球', en: 'BALL' },
  { id: 'WITHMIMI', zhCn: '与咪咪一起', en: 'WITH MIMI' },
  { id: 'BATTLE', zhCn: '战斗', en: 'BATTLE' },
  { id: 'STERILIZATION', zhCn: '绝育期间', en: 'STERILIZATION' },
] as const

export const floraAlbumStages = [
  {
    id: 'before',
    start: '2025-04-01',
    end: '2025-06-01',
    range: '2025/04～2025/06',
    zhCn: '领养前',
    en: 'Before Adoption',
  },
  {
    id: 'arrival',
    start: '2025-06-01',
    end: '2026-02-01',
    range: '2025/06～2026/02',
    zhCn: '初来乍到',
    en: 'Settling In',
  },
  {
    id: 'mimi',
    start: '2026-02-01',
    end: '2026-06-01',
    range: '2026/02～2026/06',
    zhCn: '咪咪借宿',
    en: 'Mimi’s Stay',
  },
  {
    id: 'big',
    start: '2026-06-01',
    end: null,
    range: '2026/06～NOW',
    zhCn: '大肥猫',
    en: 'Big Fat Cat',
  },
] as const

export const matchesFloraAlbumTag = (item: FloraMedia, tag: string) =>
  tag === 'all' || (item.key.split('/').pop() || '').toUpperCase().includes(tag)

export const getFloraAlbumStage = (item: FloraMedia) => {
  const date = getFloraCaptureDate(item.key)
  // 交界月份的 1 日归新阶段；无有效日期或早于记录范围的文件不猜测归属。
  return date
    ? floraAlbumStages.find(
        (stage) => date >= stage.start && (!stage.end || date < stage.end)
      )?.id ?? 'unknown'
    : 'unknown'
}
