import * as THREE from 'three'

export const LUCARIO_HEADACHE_RED = '#ff2020'
export const LUCARIO_HEADACHE_STICKER_RED = '#a63d32'

export interface LucarioHeadacheConfig {
  mode: 'normal' | 'headache'
  bodyTwist: number
  upperArmTwist: number
  forearmTwist: number
  headLeanBack: number
  headTilt: number
}

/** 在场景副本上生成姿态，缓存资源及 ATRIUM 的正常姿态不受影响。 */
export function prepareHeadachePose(
  surface: THREE.BufferGeometry,
  config: LucarioHeadacheConfig
) {
  const target = surface.clone()
  const positions = target.getAttribute('position')
  const head = surface.getAttribute('headNodInfluence')
  const point = new THREE.Vector3()
  const rotation = new THREE.Quaternion()
  const axis = new THREE.Vector3()
  const pivot = new THREE.Vector3()
  const rotate = (x: number, y: number, z: number, degrees: number) => {
    rotation.setFromAxisAngle(
      axis.set(x, y, z),
      THREE.MathUtils.degToRad(degrees)
    )
    point.sub(pivot).applyQuaternion(rotation).add(pivot)
  }
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i)
    const x = point.x
    const y = point.y
    const side = Math.sign(x)
    // 用连续权重衔接肩、肘和腰部，避免在静态网格上切出断层。
    const arm =
      THREE.MathUtils.smoothstep(Math.abs(x), 0.28, 0.48) * (1 - head.getX(i))
    const forearm = 1 - THREE.MathUtils.smoothstep(y, 1.45, 1.9)
    // 绕横向 X 轴前后摆动，双臂使用相同的前后方向。
    pivot.set(side * 0.48, 1.68, 0)
    rotate(1, 0, 0, config.forearmTwist * arm * forearm)
    pivot.set(side * 0.35, 2.05, 0)
    rotate(1, 0, 0, config.upperArmTwist * arm * (side > 0 ? 1 : 0.7))
    pivot.set(0, 1.25, 0)
    rotate(0, 1, 0, config.bodyTwist * THREE.MathUtils.smoothstep(y, 1.2, 2.15))
    positions.setXYZ(i, point.x, point.y, point.z)
  }
  target.computeVertexNormals()
  surface.morphAttributes.position = [positions.clone()]
  surface.morphAttributes.normal = [target.getAttribute('normal').clone()]
  target.dispose()
}

export const DIZZY_STICKER_FRAME_MS = 100

/** 每次换帧重新随机布局，使用单张小纹理，不再循环固定的四张图。 */
export function createDizzySticker(onUpdate?: () => void) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const font = '600 38px "UnboundedSans"'
  const fontReady = () => !document.fonts || document.fonts.check(font, 'ERROR')
  const paint = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const drawText = fontReady()
    const random = Math.random
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, 512, 256)
    ctx.clip()
    ctx.fillStyle = '#ffffff'
    const count = 10 + Math.floor(random() * 3)
    for (let layer = 0; layer < count; layer++) {
      const size = 30 + random() * 62
      const x = 120 + random() * 272
      const y = 62 + random() * 128
      ctx.save()
      ctx.translate(x, y)
      ctx.globalAlpha = 0.18 + random() * 0.36
      ctx.fillRect(-size / 2, -size / 2, size, size)
      ctx.restore()
    }
    for (let fragment = 0; fragment < 5; fragment++) {
      const size = 9 + random() * 16
      ctx.globalAlpha = 0.2 + random() * 0.3
      ctx.fillRect(76 + random() * 352, 28 + random() * 196, size, size)
    }
    if (drawText) {
      ctx.textBaseline = 'middle'
      const labelCount = 2 + Math.floor(random() * 2)
      // 与方块保持水平；文字透明度略高，避免叠加后无法辨认。
      for (let label = 0; label < labelCount; label++) {
        const size = 30 + Math.floor(random() * 17)
        ctx.font = `600 ${size}px "UnboundedSans"`
        ctx.globalAlpha = 0.65 + random() * 0.25
        ctx.fillText('ERROR', 86 + random() * 224, 48 + random() * 156)
      }
    }
    ctx.restore()
  }
  paint()
  const texture = new THREE.CanvasTexture(canvas)
  // 动态小纹理不生成多级贴图，避免每次上传都重新生成 mipmap。
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.colorSpace = THREE.SRGBColorSpace
  if (!fontReady()) {
    let disposed = false
    texture.addEventListener('dispose', () => {
      disposed = true
    })
    // 复用站点已注册的字体面，不阻塞模型入场，也不将后备字体烘焙进纹理。
    void document.fonts
      .load(font, 'ERROR')
      .then(() => {
        if (disposed || !fontReady()) return
        paint()
        texture.needsUpdate = true
        onUpdate?.()
      })
      .catch(() => {})
  }
  let lastFrame = 0
  return {
    texture,
    update(frame: number) {
      if (lastFrame === frame) return
      lastFrame = frame
      paint()
      texture.needsUpdate = true
    },
  }
}
