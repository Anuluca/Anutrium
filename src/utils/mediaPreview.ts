const VIDEO_FILE_PATTERN = /\.(?:mov|mp4|webm|m4v|ogv)(?:[?#].*)?$/i

export const isVideoUrl = (url: string) => VIDEO_FILE_PATTERN.test(url)

export const IMAGE_ZOOM_THRESHOLD = 1.01

/** 按钮缩放写入 transform，双指缩放写入 scale，两者共同决定实际比例。 */
export const getImageScale = (
  image: HTMLImageElement,
  gestureScale = Number(image.style.scale || 1)
) => {
  const nativeScale = Number(
    /scale\(([^)]+)\)/.exec(image.style.transform)?.[1] ?? 1
  )
  return nativeScale * gestureScale
}
