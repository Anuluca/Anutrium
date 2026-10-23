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
  // 旧压缩文件没有作品名；要求末尾两段中包含中文，避免显示处理标记或哈希。
  const hasTitle =
    parts.length >= 4 && names.some((name) => /\p{Script=Han}/u.test(name))
  return {
    date,
    title: hasTitle
      ? names.find((name) => /\p{Script=Han}/u.test(name)) || ''
      : '',
    titleEn: hasTitle
      ? names.find((name) => !/\p{Script=Han}/u.test(name)) || ''
      : '',
  }
}
