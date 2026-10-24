import { getFloraCaptureDate } from './floratriumMedia'

export const getCreativeImageInfo = (source: string) => {
  let filename = source.split(/[?#]/)[0].split('/').pop() || ''
  try {
    filename = decodeURIComponent(filename)
  } catch {
    // 无效转义保留原文件名，避免单个资源影响整页。
  }
  const date = getFloraCaptureDate(filename)
  const parts = filename.replace(/\.[^.]+$/, '').split('_')
  const names = parts.slice(-2)
  // 末尾按英文名、中文名读取，允许 Lofi 等两种语言相同的名称；排除旧压缩文件。
  const hasTitle =
    parts.length >= 4 &&
    !parts.some((part) => /^(?:compressed|converted|originals)$/i.test(part)) &&
    names.every((name) => name.trim())
  return {
    date,
    title: hasTitle
      ? names.find((name) => /\p{Script=Han}/u.test(name)) || names[1]
      : '',
    titleEn: hasTitle
      ? names.find((name) => !/\p{Script=Han}/u.test(name)) || names[0]
      : '',
  }
}
