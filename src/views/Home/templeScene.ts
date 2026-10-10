import { gsap } from 'gsap'
import * as THREE from 'three'

import {
  type TempleExperience,
  templeExperience,
} from '@/config/templeExperience'
import {
  templeCategories,
  type TempleCategoryId,
} from '@/config/templeNavigation'
import { cursorState } from '@/stores'
import { subscribePointerSamples } from '@/utils/pointerSamples'

import type { TemplePresentation } from './templePresentation'

export type TempleSelection = TempleCategoryId | 'statue'

interface TempleCallbacks {
  waitForRouteEnter: () => Promise<void>
  prepared: () => void
  progress: (value: number) => void
  ready: () => void
  beforeReturn: () => Promise<void> | undefined
  select: (id: TempleSelection | null) => void
  settled: () => void
  error: (error: unknown) => void
}

const MAX_RENDER_PIXELS = 2048 * 2048
const DIAGNOSTIC_INTERVAL = 100
const SCENE_VERTICAL_OFFSET = 0.0125
const INNER_OBELISK_ADVANCE = 3
const INNER_STATUE_RETREAT = 5
const OBELISK_SCALE = new THREE.Vector3(1.28, 1.22, 1.28)
const ENTRANCE_SPEED = 1.2
const ENTRANCE_DURATION = 6.8 / ENTRANCE_SPEED
const ENTRANCE_PLAYBACK_RATE = 1.2
const INNER_PILLAR_ENTRANCE_DELAY = 1.1 / ENTRANCE_SPEED
const OUTER_PILLAR_ENTRANCE_DELAY = 1.55 / ENTRANCE_SPEED
const PILLAR_ENTRANCE_DURATION = 3.2
const HOLY_LIGHT_ENTRANCE_DELAY =
  INNER_PILLAR_ENTRANCE_DELAY + 0.6 * ENTRANCE_PLAYBACK_RATE
const FOCUS_LOOK_UP_DEGREES = 10
const OBELISK_ENTRANCE_DEPTH = 7.5
const OBELISK_BASE_TOP = 0.34
const HOLY_LIGHT_COLOR = '#E23455'
const STATUE_PREVIEW_SCALE = 1.5
const STATUE_PREVIEW_VERTICAL_OFFSET = 0.12

export function createHomeTemple(
  stage: HTMLElement,
  buttons: Map<string, HTMLElement>,
  callbacks: TempleCallbacks,
  config: TemplePresentation,
  experience: TempleExperience = templeExperience,
  simpleEntrance = false
) {
  const { model } = experience
  const rig = model.rig
  const headNodDegrees = rig.enabled ? rig.entranceNod : 0
  const neckExtension = rig.enabled ? rig.neckExtension : 0
  const categories = templeCategories.map((item) => ({
    ...item,
    ...config.scene.positions[item.id],
  }))
  stage.dataset.entranceMode = simpleEntrance ? 'simple' : 'full'
  stage.dataset.layout = config.id
  stage.dataset.model = model.id
  const cursorStateStore = cursorState()
  const statueCursorSource = 'island-statue'
  const syncStatueCursor = (
    hit: TempleSelection | undefined,
    target: EventTarget | null
  ) => {
    statueHovered = hit === 'statue' && target === renderer.domElement
    cursorStateStore.setInteractive(
      statueCursorSource,
      !entranceActive && hit === 'statue' && target === renderer.domElement
    )
  }
  const isSceneTarget = (target: EventTarget | null) =>
    target === renderer.domElement ||
    (target instanceof Element && !!target.closest('.temple-obelisk'))
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.localClippingEnabled = true
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', `${model.label}三维模型`)
  stage.appendChild(renderer.domElement)
  renderer.domElement.style.visibility = 'hidden'
  stage.style.opacity = '0'
  // 只移动标题内层，让文字从地平线下方升起；独立标题外层始终贴合地平线。
  const heroEntranceText = stage.querySelector<HTMLElement>(
    '.temple-backdrop h1'
  )
  if (heroEntranceText)
    gsap.set(heroEntranceText, { yPercent: 100, opacity: 0 })
  stage.dataset.entranceFinished = 'false'
  stage.dataset.maxFps = '60'
  stage.dataset.pointerSampleMs = String(1000 / 30)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  const lookAt = new THREE.Vector3(0, 4.25, -2)
  const homePosition = new THREE.Vector3(0, 1, 20)
  const homeTarget = lookAt.clone()
  camera.position.copy(homePosition)
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value)
    return value
  }
  const material = <T extends THREE.Material>(value: T): T => {
    materials.add(value)
    return value
  }
  const texture = <T extends THREE.Texture>(value: T): T => {
    textures.add(value)
    return value
  }
  let disposed = false
  let ready = false
  let sceneActive = true
  let frame: number | undefined
  let lastDraw = 0
  let motionIdle = true
  let selected: TempleSelection | null = null
  let transition: gsap.core.Timeline | undefined
  let transitionActive = false
  let entranceActive = false
  let cameraMoving = false
  const entranceHeadDip = { value: 0 }
  let motionStart = 0
  let pausedAt = 0
  let statueHovered = false
  const statueHover = { value: 0 }
  const templeReveal = { value: 1 }
  const glitchTime = { value: 0 }
  let returningStatue = false
  let hovered: TempleCategoryId | null = null
  const lastPointer = new THREE.Vector2()
  let hasPointer = false
  let preparation: Promise<void> | undefined
  let projectionDirty = true
  let lastDiagnosticAt = -Infinity
  let diagnosticsDirty = true
  let viewWidth = 0
  let viewHeight = 0
  const focusFraming = { x: 0, y: 0 }
  const applyViewOffset = () => {
    if (!viewWidth || !viewHeight) return
    // 调整相机投影，让雕像、碑身、圣光和倒影整体让出菜单空间；点击投影使用同一相机。
    camera.setViewOffset(
      viewWidth,
      viewHeight,
      -viewWidth * focusFraming.x,
      -viewHeight * (SCENE_VERTICAL_OFFSET + focusFraming.y),
      viewWidth,
      viewHeight
    )
    projectionDirty = true
  }
  const markProjectionDirty = () => {
    projectionDirty = true
  }
  let pointerBounds: DOMRect | undefined
  let pointerBoundsDirty = true
  const stageData = new Map<string, string>()
  const setStageData = (name: string, value: string) => {
    if (stageData.get(name) === value) return
    stageData.set(name, value)
    stage.dataset[name] = value
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let bufferWidth = 0
  let bufferHeight = 0
  let bufferRatio = 0
  const updateDrawingBuffer = () => {
    if (!viewWidth || !viewHeight) return
    const ratio = Math.min(
      devicePixelRatio || 1,
      1.5,
      Math.sqrt(MAX_RENDER_PIXELS / (viewWidth * viewHeight))
    )
    if (
      bufferWidth === viewWidth &&
      bufferHeight === viewHeight &&
      bufferRatio === ratio
    )
      return
    bufferWidth = viewWidth
    bufferHeight = viewHeight
    bufferRatio = ratio
    // 仅窗口尺寸改变时调整缓冲区，避免重复 setPixelRatio/setSize 重建同一尺寸的画布。
    renderer.setDrawingBufferSize(viewWidth, viewHeight, ratio)
    setStageData('renderPixelRatio', String(ratio))
  }

  const monuments = new THREE.Group()
  scene.add(monuments)
  const reflection = new THREE.Group()
  reflection.scale.y = -1
  scene.add(reflection)
  const ambient = new THREE.AmbientLight(0xb45d71, 0.65)
  scene.add(ambient)
  const key = new THREE.DirectionalLight(0xffb7c9, 1.6)
  key.position.set(-5, 10, 8)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xf21148, 2.8)
  rim.position.set(6, 6, -9)
  scene.add(rim)

  // 所有方尖碑共用几何体；顶部独立使用完整的四面锥体。
  // 每面一组菱形切面，中心微凹、边界保持原轮廓；独立三角面法线产生真实的切割反光。
  const facetPositions: number[] = []
  const facetColors: number[] = []
  const addFacet = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    shade = 1
  ) => {
    for (const point of [a, b, c]) {
      facetPositions.push(point.x, point.y, point.z)
      facetColors.push(shade, shade, shade)
    }
  }
  const halfWidth = (y: number) => 0.65 * (1 - ((y + 2.275) / 4.55) * 0.28)
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2
    const point = (x: number, y: number, inset = 0) =>
      new THREE.Vector3(x, y, halfWidth(y) - inset).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        angle
      )
    const bottom = -2.275
    const top = 2.275
    const middle = (bottom + top) / 2
    const bottomLeft = point(-halfWidth(bottom), bottom)
    const bottomRight = point(halfWidth(bottom), bottom)
    const topLeft = point(-halfWidth(top), top)
    const topRight = point(halfWidth(top), top)
    const lower = point(0, bottom)
    const upper = point(0, top)
    const left = point(-halfWidth(middle), middle)
    const right = point(halfWidth(middle), middle)
    const center = point(0, middle, 0.1)
    addFacet(lower, right, center, 0.35)
    addFacet(right, upper, center, 1.35)
    addFacet(upper, left, center, 0.65)
    addFacet(left, lower, center, 1.08)
    addFacet(bottomLeft, lower, left, 0.96)
    addFacet(lower, bottomRight, right, 0.96)
    addFacet(left, upper, topLeft, 0.96)
    addFacet(right, topRight, upper, 0.96)
    for (const y of [-2.275, 2.275]) {
      const center = new THREE.Vector3(0, y, 0)
      const left = point(-halfWidth(y), y)
      const right = point(halfWidth(y), y)
      if (y > 0) addFacet(center, left, right)
      else addFacet(center, right, left)
    }
  }
  const bodyGeometry = geometry(new THREE.BufferGeometry())
  bodyGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(facetPositions, 3)
  )
  bodyGeometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(facetColors, 3)
  )
  bodyGeometry.computeVertexNormals()
  const capGeometry = geometry(new THREE.ConeGeometry(0.663, 1.05, 4))
  capGeometry.rotateY(Math.PI / 4)
  const footGeometry = geometry(new THREE.BoxGeometry(1.8, 0.21, 1.8))
  const stepGeometry = geometry(new THREE.BoxGeometry(2.35, 0.13, 2.35))
  const capEdges = geometry(new THREE.EdgesGeometry(capGeometry, 25))
  const labelGeometry = geometry(new THREE.PlaneGeometry(0.82, 4.22))
  const plinthMaterial = material(
    new THREE.MeshStandardMaterial({
      color: 0x300b18,
      metalness: 0.55,
      roughness: 0.38,
      envMapIntensity: 0.6,
      emissive: 0x26050d,
      emissiveIntensity: 0.08,
    })
  )

  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = glowCanvas.height = 128
  const glowContext = glowCanvas.getContext('2d')!
  const gradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,0.7)')
  gradient.addColorStop(0.22, 'rgba(199,199,199,0.3)')
  gradient.addColorStop(1, 'rgba(120,120,120,0)')
  glowContext.fillStyle = gradient
  glowContext.fillRect(0, 0, 128, 128)
  const glowMap = texture(new THREE.CanvasTexture(glowCanvas))
  glowMap.colorSpace = THREE.SRGBColorSpace
  const glowGeometry = geometry(new THREE.PlaneGeometry(5, 5))

  const labelTexture = (roman: string, title: string) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 1536
    const context = canvas.getContext('2d')!
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const paint = () => {
      context.clearRect(0, 0, 256, 1536)
      context.fillStyle = '#f52e5b'
      context.font = '700 72px UnboundedSans, sans-serif'
      context.fillText(roman, 128, 130)
      context.save()
      context.translate(128, 810)
      context.scale(1, 1.45)
      context.rotate(Math.PI / 2)
      context.fillStyle = '#fff3f5'
      context.font = '800 100px UnboundedSans, sans-serif'
      const spacing = 6
      const widths = [...title].map(
        (letter) => context.measureText(letter).width
      )
      let x =
        -(
          widths.reduce((sum, width) => sum + width, 0) +
          spacing * (title.length - 1)
        ) / 2
      context.textAlign = 'left'
      for (let index = 0; index < title.length; index++) {
        context.fillText(title[index], x, 0)
        x += widths[index] + spacing
      }
      context.restore()
    }
    paint()
    const map = texture(new THREE.CanvasTexture(canvas))
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    document.fonts.ready.then(() => {
      if (disposed) return
      paint()
      map.needsUpdate = true
      invalidate()
    })
    return map
  }

  const beamGeometry = geometry(
    new THREE.CylinderGeometry(0.18, 1.7, 16, 32, 1, true)
  )
  const poolGeometry = geometry(new THREE.PlaneGeometry(5, 5))
  const obelisks = categories.map((category) => {
    const group = new THREE.Group()
    group.position.set(category.x, 0, category.z)
    const inwardAngle = category.z > 0 ? 40 : 24
    group.rotation.y =
      -Math.sign(category.x) * THREE.MathUtils.degToRad(inwardAngle)
    group.scale.copy(OBELISK_SCALE)
    group.scale.x *= config.scene.obeliskWidthScale
    group.scale.z *= config.scene.obeliskWidthScale
    monuments.add(group)
    const shaft = new THREE.Group()
    shaft.name = 'obelisk-shaft'
    group.add(shaft)
    const surface = material(
      new THREE.MeshPhysicalMaterial({
        color: 0x5a192d,
        vertexColors: true,
        metalness: 0.3,
        roughness: 0.4,
        clearcoat: 0.22,
        clearcoatRoughness: 0.22,
        envMapIntensity: 0.55,
        emissive: 0x22040b,
        emissiveIntensity: 0.025,
      })
    )
    const body = new THREE.Mesh(bodyGeometry, surface)
    body.position.y = OBELISK_BASE_TOP + 2.275
    body.userData.category = category.id
    shaft.add(body)
    const crystal = material(
      new THREE.MeshPhysicalMaterial({
        color: 0x660d25,
        emissive: 0x9d0c2f,
        emissiveIntensity: 0.2,
        metalness: 0.72,
        roughness: 0.13,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        flatShading: true,
        clearcoat: 1,
        envMapIntensity: 0.65,
      })
    )
    const cap = new THREE.Mesh(capGeometry, crystal)
    cap.position.y = body.position.y + 2.275 + 1.05 / 2
    cap.userData.category = category.id
    shaft.add(cap)
    const core = new THREE.Mesh(
      capGeometry,
      material(
        new THREE.MeshBasicMaterial({
          color: 0xf02656,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    )
    core.position.copy(cap.position)
    core.scale.set(0.6, 0.82, 0.6)
    shaft.add(core)
    const edge = material(
      new THREE.LineBasicMaterial({
        color: 0xee335a,
        transparent: true,
        opacity: 0.58,
        toneMapped: false,
      })
    )
    const capLines = new THREE.LineSegments(capEdges, edge)
    capLines.position.copy(cap.position)
    shaft.add(capLines)
    // 共用现有径向光晕，以单张朝向镜头的纹理表现晶体扩散，无需 Bloom 或离屏通道。
    const capHaloMaterial = material(
      new THREE.SpriteMaterial({
        map: glowMap,
        color: 0xff2351,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      })
    )
    const capHalo = new THREE.Sprite(capHaloMaterial)
    capHalo.position.copy(cap.position)
    capHalo.position.y += 0.2
    capHalo.scale.set(2.6, 2.8, 1)
    capHalo.renderOrder = -0.75
    shaft.add(capHalo)
    const baseMaterial = material(plinthMaterial.clone())
    for (const [shape, y] of [
      [stepGeometry, 0.065],
      [footGeometry, 0.235],
    ] as const) {
      const foot = new THREE.Mesh(shape, baseMaterial)
      foot.position.y = y
      group.add(foot)
    }
    const labelAccent = { value: new THREE.Color('#f52e5b') }
    const labelMaterial = material(
      new THREE.MeshBasicMaterial({
        map: labelTexture(category.roman, category.title),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    )
    labelMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.labelAccent = labelAccent
      shader.fragmentShader =
        'uniform vec3 labelAccent;\n' +
        shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
        float accentMask=1.-smoothstep(0.35,0.75,diffuseColor.g/max(diffuseColor.r,0.00001));
        diffuseColor.rgb=mix(diffuseColor.rgb,labelAccent,accentMask);`
        )
    }
    labelMaterial.customProgramCacheKey = () => 'temple-label-accent-v1'
    const label = new THREE.Mesh(labelGeometry, labelMaterial)
    // 正面随碑身收分倾斜，文字与石材保持同一个透视平面。
    label.position.set(0, body.position.y, 0.565)
    label.rotation.x = -Math.atan(0.182 / 4.55)
    // 只缩窄碑身，补偿父级横向缩放，让碑文保持与 PC 相同的字形比例。
    label.scale.x = 1 / config.scene.obeliskWidthScale
    shaft.add(label)
    const glowMaterial = material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        color: 0xff2351,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.018
    glow.renderOrder = 2
    group.add(glow)
    const beamMaterial = material(
      new THREE.ShaderMaterial({
        uniforms: {
          intensity: { value: 0 },
          glowColor: { value: new THREE.Color(HOLY_LIGHT_COLOR) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        vertexShader:
          'varying vec2 vUv;varying vec3 world;varying vec3 normalWorld;void main(){vUv=uv;world=(modelMatrix*vec4(position,1.)).xyz;normalWorld=mat3(modelMatrix)*normal;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
        fragmentShader: `varying vec2 vUv;varying vec3 world;varying vec3 normalWorld;uniform float intensity;uniform vec3 glowColor;
        void main(){
          float edge=pow(abs(dot(normalize(normalWorld),normalize(cameraPosition-world))),1.3);
          float falloff=pow(1.-vUv.y,0.7)*smoothstep(0.,0.05,vUv.y);
          gl_FragColor=vec4(glowColor,edge*falloff*intensity*0.5);
          #include <colorspace_fragment>
        }`,
      })
    )
    const beam = new THREE.Mesh(beamGeometry, beamMaterial)
    beam.position.y = 8.1
    // 运镜结束变为水平视角时，光柱与晶体的投影深度相等；固定先画光、后画晶体，
    // 避免透明排序改用对象 ID 后将加法圣光叠到晶体上，造成最后一帧突然变亮。
    beam.renderOrder = -0.5
    group.add(beam)
    const poolMaterial = material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        color: 0xff2351,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    const pool = new THREE.Mesh(poolGeometry, poolMaterial)
    pool.position.y = 0.025
    pool.rotation.x = -Math.PI / 2
    pool.renderOrder = 3
    group.add(pool)
    const spot = new THREE.SpotLight(
      HOLY_LIGHT_COLOR,
      0,
      15,
      Math.PI / 32,
      0.85,
      1.5
    )
    spot.position.set(category.x, 12, category.z + 0.6)
    spot.target.position.set(category.x, 1, category.z)
    scene.add(spot, spot.target)
    // 仅碑身升降，底座常驻；裁切面与底座顶面一致，避免石柱穿出底座侧面。
    shaft.traverse((object) => {
      if (
        !(
          object instanceof THREE.Mesh ||
          object instanceof THREE.LineSegments ||
          object instanceof THREE.Sprite
        )
      )
        return
      ;(object.material as THREE.Material).clippingPlanes = [
        new THREE.Plane(
          new THREE.Vector3(0, 1, 0),
          -OBELISK_BASE_TOP * OBELISK_SCALE.y
        ),
      ]
    })
    return {
      category,
      group,
      shaft,
      body,
      cap,
      surface,
      baseMaterial,
      crystal,
      core,
      edge,
      capHalo,
      capHaloMaterial,
      labelMaterial,
      labelAccent,
      glowMaterial,
      beamMaterial,
      beam,
      poolMaterial,
      pool,
      spot,
      strength: 0,
      hoverStrength: 0,
      hoverColor: new THREE.Color(category.themeColor),
      crystalTints: [
        crystal.color,
        crystal.emissive,
        (core.material as THREE.MeshBasicMaterial).color,
        edge.color,
        capHaloMaterial.color,
      ],
    }
  })
  const obeliskById = new Map(obelisks.map((item) => [item.category.id, item]))
  let focusedObelisk: (typeof obelisks)[number] | undefined

  // 地面与远处光幕共用清晰的边界；沿镜头水平朝向排列，保证地平线无倾斜。
  const ground = new THREE.Group()
  scene.add(ground)
  const horizonZ = -40
  const floor = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(240, 160)),
    material(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        // 用镜头空间深度控制近黑远亮，聚焦运镜时自动跟随，无需逐帧更新 uniform。
        vertexShader: `varying vec3 world;varying float floorDepth;void main(){
        world=(modelMatrix*vec4(position,1.)).xyz;
        vec4 viewPosition=modelViewMatrix*vec4(position,1.);
        floorDepth=-viewPosition.z;
        gl_Position=projectionMatrix*viewPosition;
      }`,
        uniforms: {
          nearColor: { value: new THREE.Color(0.0003, 0.00005, 0.0001) },
          farColor: { value: new THREE.Color(0.023, 0.003, 0.008) },
          sheenColor: { value: new THREE.Color(0.006, 0, 0) },
        },
        fragmentShader: `varying vec3 world;varying float floorDepth;uniform vec3 nearColor;uniform vec3 farColor;uniform vec3 sheenColor;void main(){
        float sheen=0.5+0.5*sin(world.z*4.+sin(world.x*1.5)*0.25);
        float distanceFade=smoothstep(3.,18.,floorDepth);
        vec3 floorColor=mix(nearColor,farColor+sheen*sheenColor,distanceFade);
        gl_FragColor=vec4(floorColor,mix(0.97,0.58,distanceFade));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      })
    )
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -0.012, horizonZ + 80)
  floor.renderOrder = 1
  ground.add(floor)
  const horizonGlow = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(240, 18)),
    material(
      new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(HOLY_LIGHT_COLOR) },
          strength: { value: 0.34 },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 vUv;uniform vec3 glowColor;uniform float strength;void main(){
        float rise=exp(-vUv.y*5.)*(1.-smoothstep(0.7,1.,vUv.y));
        gl_FragColor=vec4(glowColor,rise*strength);
        #include <colorspace_fragment>
      }`,
      })
    )
  )
  horizonGlow.position.set(0, 9 - 0.012, horizonZ)
  horizonGlow.renderOrder = -1
  ground.add(horizonGlow)
  // 复用地平线光幕几何体，下方光比上方更淡；无需额外光源或离屏渲染。
  const horizonFallMaterial = material(horizonGlow.material.clone())
  horizonFallMaterial.uniforms.strength.value = 0.12
  const horizonFallGlow = new THREE.Mesh(
    horizonGlow.geometry,
    horizonFallMaterial
  )
  horizonFallGlow.rotation.z = Math.PI
  horizonFallGlow.position.set(0, -9 - 0.012, horizonZ)
  horizonFallGlow.renderOrder = 2
  ground.add(horizonFallGlow)
  const statueZ = -1.8
  const pedestal = new THREE.Group()
  pedestal.position.z = statueZ
  for (const [width, height, y] of [
    [6.4, 0.14, 0.07],
    [5.8, 0.18, 0.23],
    [5.2, 0.2, 0.42],
  ]) {
    const step = new THREE.Mesh(
      geometry(new THREE.BoxGeometry(width, height, 3.2)),
      plinthMaterial
    )
    step.position.y = y
    pedestal.add(step)
  }
  scene.add(pedestal)
  const statueGlow = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(10, 8)),
    material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
        color: 0xff2351,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  )
  statueGlow.rotation.x = -Math.PI / 2
  statueGlow.position.set(0, 0.02, statueZ + 1)
  statueGlow.renderOrder = 2
  scene.add(statueGlow)
  const statueLight = new THREE.PointLight(0xff164d, 42, 13, 2)
  statueLight.position.set(0, 2.7, statueZ + 3)
  scene.add(statueLight)
  // 一张加宽的竖直光幕表现背后圣光；无阴影灯、离屏通道或逐帧噪声，跟随现有运镜循环更新朝向。
  const statueHolyLight = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(9.6, 13)),
    material(
      new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(HOLY_LIGHT_COLOR) },
          intensity: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 vUv;uniform vec3 glowColor;uniform float intensity;void main(){
        float width=mix(0.48,0.20,vUv.y);
        float cone=1.-smoothstep(width*0.15,width,abs(vUv.x-0.5));
        float fade=smoothstep(0.,0.045,vUv.y)*(1.-smoothstep(0.65,1.,vUv.y));
        float rays=0.8+0.2*pow(0.5+0.5*sin(vUv.x*42.+vUv.y*3.),6.);
        gl_FragColor=vec4(glowColor,cone*fade*rays*(0.44+0.24*(1.-vUv.y))*intensity);
        #include <colorspace_fragment>
      }`,
      })
    )
  )
  scene.add(statueHolyLight)

  // 倒影共用几何体，仅增加镜像绘制；聚焦直接绘制场景，不增加离屏或模糊通道。
  const reflectionMaterials: {
    source: THREE.MeshStandardMaterial
    copy: THREE.MeshStandardMaterial
  }[] = []
  const reflectionColors: { source: THREE.Color; copy: THREE.Color }[] = []
  const mirror = (source: THREE.Object3D, opacity: number) => {
    const copy = source.clone(true)
    copy.traverse((object) => {
      if (object instanceof THREE.Sprite) {
        object.visible = false
        return
      }
      if (
        !(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)
      )
        return
      const original = object.material as THREE.Material
      if (
        original instanceof THREE.ShaderMaterial ||
        original.blending === THREE.AdditiveBlending
      ) {
        object.visible = false
        return
      }
      const faded = material(original.clone())
      faded.transparent = true
      faded.opacity = opacity
      faded.depthWrite = false
      if (original.clippingPlanes?.length) {
        // 镜像裁切面随地面翻转，保留同一段半身；头部形变仍共享原模型的 uniform。
        faded.clippingPlanes = original.clippingPlanes.map(
          (plane) =>
            new THREE.Plane(
              new THREE.Vector3(
                plane.normal.x,
                -plane.normal.y,
                plane.normal.z
              ),
              plane.constant
            )
        )
        faded.onBeforeCompile = original.onBeforeCompile
      }
      if (
        original instanceof THREE.MeshStandardMaterial &&
        faded instanceof THREE.MeshStandardMaterial
      )
        reflectionMaterials.push({ source: original, copy: faded })
      if (
        'color' in original &&
        'color' in faded &&
        !(original instanceof THREE.MeshStandardMaterial)
      )
        reflectionColors.push({
          source: (original as THREE.MeshBasicMaterial).color,
          copy: (faded as THREE.MeshBasicMaterial).color,
        })
      object.material = faded
    })
    reflection.add(copy)
    return copy
  }
  const reflectedObelisks = obelisks.map((item) => mirror(item.group, 0.46))
  const reflectedShafts = reflectedObelisks.map(
    (group) => group.getObjectByName('obelisk-shaft')!
  )
  const moveShaft = (
    timeline: gsap.core.Timeline,
    index: number,
    y: number,
    duration: number,
    delay = 0,
    onStart?: () => void
  ) => {
    const shaft = obelisks[index].shaft
    if (y === 0)
      timeline.set([shaft, reflectedShafts[index]], { visible: true }, delay)
    timeline.to(
      shaft.position,
      {
        y,
        duration,
        ease: 'power2.inOut',
        onStart,
        onUpdate: markProjectionDirty,
        onComplete: () => {
          if (y < 0) {
            shaft.visible = false
            reflectedShafts[index].visible = false
            projectionDirty = true
          }
        },
      },
      delay
    )
  }
  const reflectedPedestal = mirror(pedestal, 0.34)
  let reflectedStatue: THREE.Object3D | undefined
  const themeColor = new THREE.Color('#e23456')
  const themeOrigin = themeColor.getHSL({ h: 0, s: 0, l: 0 })
  const tintTargets: {
    color: THREE.Color
    h: number
    s: number
    l: number
    current: THREE.Color
    start: THREE.Color
    target: THREE.Color
  }[] = []
  const tintByColor = new Map<THREE.Color, (typeof tintTargets)[number]>()
  const trackTint = (color: THREE.Color) => {
    const hsl = color.getHSL({ h: 0, s: 0, l: 0 })
    if (hsl.s <= 0.08 || tintByColor.has(color)) return
    const entry = {
      color,
      ...hsl,
      current: color.clone(),
      start: color.clone(),
      target: color.clone(),
    }
    tintTargets.push(entry)
    tintByColor.set(color, entry)
  }
  // 只改颜色 uniform，不重建材质、模型、纹理或后处理通道。
  const themeBlend = { value: 1 }
  let themeTransition: gsap.core.Tween | undefined
  const applyThemeTint = () => {
    // 直接混合当前色和目标色；快速切换时从当前帧继续，避免颜色跳变。
    const progress = themeBlend.value
    for (const item of tintTargets) {
      item.current.copy(item.start).lerp(item.target, progress)
      item.color.copy(item.current)
    }
    invalidate()
  }
  const setThemeColor = (color: string, animate = true) => {
    const hsl = themeColor.set(color).getHSL({ h: 0, s: 0, l: 0 })
    themeTransition?.kill()
    for (const item of tintTargets) {
      item.start.copy(item.current)
      item.target.setHSL(
        item.h + hsl.h - themeOrigin.h,
        Math.min(1, (item.s * hsl.s) / themeOrigin.s),
        item.l
      )
    }
    stage.dataset.themeColor = color
    if (!animate || reducedMotion) {
      themeBlend.value = 1
      applyThemeTint()
    } else
      themeTransition = gsap.fromTo(
        themeBlend,
        { value: 0 },
        {
          value: 1,
          duration: 1.1,
          ease: 'power2.inOut',
          paused: !sceneActive || document.hidden,
          onUpdate: applyThemeTint,
        }
      )
  }
  const drawScene = () => renderer.render(scene, camera)
  const environmentHover = { value: 0 }

  const headRotation = { value: new THREE.Vector4(0, 0, 0, 1) }
  const headPivot = { value: new THREE.Vector3() }
  const headNodPivot = { value: new THREE.Vector3() }
  const headNodAngle = { value: 0 }
  const headCurrent = new THREE.Vector2()
  const headTarget = new THREE.Vector2()
  const headFocusStart = new THREE.Vector2()
  const headFocusMotion = { progress: 1 }
  let returningPillar = false
  const pointerTarget = new THREE.Vector2()
  const headQuaternion = new THREE.Quaternion()
  const headAngles = new THREE.Euler(0, 0, 0, 'YXZ')
  const statue = new THREE.Group()
  statue.position.set(0, 3.87, statueZ)
  scene.add(statue)
  const statueClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.52)
  const statueView = { mix: 0 }
  const statueSize = new THREE.Vector3()
  let statueHalfY = statue.position.y
  let statueFullY = statue.position.y
  let statueMesh:
    | THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>
    | undefined
  let statueWire:
    | THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
    | undefined
  const chromeMaterial = material(
    new THREE.MeshPhysicalMaterial({
      color: 0xe84d6b,
      side: THREE.DoubleSide,
      metalness: 1,
      roughness: 0.09,
      clearcoat: 0.45,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
      transparent: true,
      clippingPlanes: [statueClipPlane],
    })
  )
  chromeMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.headRotation = headRotation
    shader.uniforms.headPivot = headPivot
    shader.uniforms.headNodPivot = headNodPivot
    shader.uniforms.headNodAngle = headNodAngle
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
      attribute float headInfluence; attribute float headNodInfluence;
      uniform vec4 headRotation; uniform vec3 headPivot;
      uniform vec3 headNodPivot; uniform float headNodAngle;
      vec3 rotateHead(vec3 v,vec4 q){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
      vec4 getNodRotation(){float a=headNodAngle*headNodInfluence*0.5;return vec4(sin(a),0.,0.,cos(a));}
      vec4 getHeadRotation(){
        if(headInfluence>=0.999)return headRotation;
        if(headInfluence<=0.)return vec4(0.,0.,0.,1.);
        float angle=acos(clamp(headRotation.w,-1.,1.));
        return vec4(headRotation.xyz*sin(angle*headInfluence)/max(sin(angle),0.00001),cos(angle*headInfluence));
      }`
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nobjectNormal=rotateHead(rotateHead(objectNormal,getNodRotation()),getHeadRotation());'
      )
      .replace(
        '#include <begin_vertex>',
        // 额外低头只用 Head 子树权重、围绕头颈关节旋转；Neck 根部不参与此动作。
        '#include <begin_vertex>\ntransformed=rotateHead(transformed-headNodPivot,getNodRotation())+headNodPivot;\ntransformed=rotateHead(transformed-headPivot,getHeadRotation())+headPivot;'
      )
  }
  const wireMaterial = material(
    new THREE.MeshBasicMaterial({
      color: HOLY_LIGHT_COLOR,
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      clippingPlanes: [statueClipPlane],
    })
  )
  // 网格复用模型的静态顶点及头部变形，裁切平面数量固定，切换只更新 uniform 和透明度。
  wireMaterial.onBeforeCompile = chromeMaterial.onBeforeCompile
  // 仅写深度的实体遮住背面网格，实体材质淡出后仍保持相同的可见线条密度。
  const wireDepthMaterial = material(
    new THREE.MeshBasicMaterial({
      colorWrite: false,
      transparent: true,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      clippingPlanes: [statueClipPlane],
    })
  )
  wireDepthMaterial.onBeforeCompile = chromeMaterial.onBeforeCompile
  for (const value of materials) {
    if ('color' in value) trackTint((value as THREE.MeshBasicMaterial).color)
    if ('emissive' in value)
      trackTint((value as THREE.MeshStandardMaterial).emissive)
    if (value instanceof THREE.ShaderMaterial)
      for (const uniform of Object.values(value.uniforms) as {
        value: unknown
      }[])
        if (uniform.value instanceof THREE.Color) trackTint(uniform.value)
  }
  scene.traverse((object) => {
    if (object instanceof THREE.Light) trackTint(object.color)
  })
  for (const item of obelisks) trackTint(item.labelAccent.value)
  // 每根柱子仅缓存颜色目标。悬停只更新既有 uniform，不创建材质或后处理。
  const obeliskTints = obelisks.map((item) => {
    const colors = new Set<THREE.Color>([
      item.surface.color,
      item.surface.emissive,
      item.labelAccent.value,
      item.baseMaterial.color,
      item.baseMaterial.emissive,
      ...item.crystalTints,
      item.glowMaterial.color,
      item.poolMaterial.color,
      item.beamMaterial.uniforms.glowColor.value,
      item.spot.color,
    ])
    const hsl = item.hoverColor.getHSL({ h: 0, s: 0, l: 0 })
    return [...colors].map((color) => {
      const base = tintByColor.get(color)!
      return {
        base,
        target:
          color === item.labelAccent.value || item.crystalTints.includes(color)
            ? item.hoverColor.clone()
            : new THREE.Color().setHSL(
                base.h + hsl.h - themeOrigin.h,
                Math.min(1, (base.s * hsl.s) / themeOrigin.s),
                base.l
              ),
      }
    })
  })

  let statueWireDepth: THREE.Mesh | undefined

  const installTempleGlitch = () => {
    const header =
      'uniform float templeReveal; uniform float templeGlitchTime;\n'
    const discard = `
      if(templeReveal < 0.999){
        float band=floor(gl_FragCoord.y/6.);
        float tick=floor(templeGlitchTime*18.);
        float noise=fract(sin(band*12.9898+tick*78.233)*43758.5453);
        if(templeReveal<=0. || noise>templeReveal) discard;
      }`
    for (const value of materials) {
      if (
        [chromeMaterial, wireMaterial, wireDepthMaterial].includes(
          value as THREE.MeshBasicMaterial
        )
      )
        continue
      if (value instanceof THREE.ShaderMaterial) {
        value.uniforms.templeReveal = templeReveal
        value.uniforms.templeGlitchTime = glitchTime
        value.fragmentShader =
          header +
          value.fragmentShader.replace(/void main\(\)\s*\{/, '$&' + discard)
      } else {
        const originalCompile = value.onBeforeCompile
        const originalKey = value.customProgramCacheKey()
        value.onBeforeCompile = (shader, renderer) => {
          originalCompile.call(value, shader, renderer)
          shader.uniforms.templeReveal = templeReveal
          shader.uniforms.templeGlitchTime = glitchTime
          shader.fragmentShader =
            header +
            shader.fragmentShader.replace(/void main\(\)\s*\{/, '$&' + discard)
        }
        value.customProgramCacheKey = () => originalKey + ':temple-glitch'
      }
    }
  }

  const screenPoint = new THREE.Vector3()
  const hitPoints = [
    [-0.65, 0.1, 0.65],
    [-0.65, 0.1, -0.65],
    [0.65, 0.1, 0.65],
    [0.65, 0.1, -0.65],
    [-0.468, 4.94, 0.468],
    [-0.468, 4.94, -0.468],
    [0.468, 4.94, 0.468],
    [0.468, 4.94, -0.468],
    [0, 5.94, 0],
  ]
  const projectedPoints = hitPoints.map(() => ({ x: 0, y: 0 }))
  const sortedPoints = [...projectedPoints]
  const projectionHull: typeof projectedPoints = []
  const buttonStyles = new Map<HTMLElement, string>()
  const cross = (
    o: (typeof projectedPoints)[number],
    a: (typeof projectedPoints)[number],
    b: (typeof projectedPoints)[number]
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  // DOM 仅提供与投影轮廓吻合的无障碍点击区域；复用投影缓冲，每个按钮至多写一次样式。
  const projectButtons = () => {
    for (const item of obelisks) {
      const button = buttons.get(item.category.id)
      if (!button) continue
      if (
        entranceActive ||
        !item.shaft.visible ||
        (selected && item.category.id !== selected)
      ) {
        if (button.getAttribute('aria-hidden') !== 'true') {
          button.style.visibility = 'hidden'
          button.tabIndex = -1
          button.setAttribute('aria-hidden', 'true')
          buttonStyles.delete(button)
        }
        continue
      }
      if (button.tabIndex !== 0) button.tabIndex = 0
      if (button.hasAttribute('aria-hidden'))
        button.removeAttribute('aria-hidden')
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (let index = 0; index < hitPoints.length; index++) {
        const [x, y, z] = hitPoints[index]
        screenPoint
          .set(x, y, z)
          .applyMatrix4(item.shaft.matrixWorld)
          .project(camera)
        const point = projectedPoints[index]
        point.x = (screenPoint.x * 0.5 + 0.5) * viewWidth
        point.y = (-screenPoint.y * 0.5 + 0.5) * viewHeight
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
      sortedPoints.sort((a, b) => a.x - b.x || a.y - b.y)
      projectionHull.length = 0
      for (const point of sortedPoints) {
        while (
          projectionHull.length >= 2 &&
          cross(
            projectionHull[projectionHull.length - 2],
            projectionHull[projectionHull.length - 1],
            point
          ) <= 0
        )
          projectionHull.pop()
        projectionHull.push(point)
      }
      const lower = projectionHull.length
      for (let index = sortedPoints.length - 2; index >= 0; index--) {
        const point = sortedPoints[index]
        while (
          projectionHull.length > lower &&
          cross(
            projectionHull[projectionHull.length - 2],
            projectionHull[projectionHull.length - 1],
            point
          ) <= 0
        )
          projectionHull.pop()
        projectionHull.push(point)
      }
      const width = maxX - minX
      const height = maxY - minY
      if (width <= 0 || height <= 0) continue
      const polygon = projectionHull
        .map(
          (point) =>
            `${(((point.x - minX) / width) * 100).toFixed(3)}% ${(
              ((point.y - minY) / height) *
              100
            ).toFixed(3)}%`
        )
        .join(',')
      const zIndex = Math.round(
        100 - camera.position.distanceTo(item.group.position)
      )
      const styles = `left:${minX.toFixed(2)}px;top:${minY.toFixed(
        2
      )}px;width:${width.toFixed(2)}px;height:${height.toFixed(
        2
      )}px;clip-path:polygon(${polygon});visibility:visible;z-index:${zIndex};`
      if (buttonStyles.get(button) !== styles) {
        button.style.cssText = styles
        buttonStyles.set(button, styles)
      }
    }
  }

  // 返回展开模块时仍须完成入场及 ready 信号，随后才暂停隐藏的场景。
  const isSceneActive = () =>
    (sceneActive || entranceActive) && !document.hidden
  const canRender = () =>
    ready && isSceneActive() && !disposed && stage.isConnected
  const render = (now: number) => {
    frame = undefined
    if (!canRender()) return
    if (now - lastDraw < 1000 / 60 - 0.1) {
      invalidate()
      return
    }
    // 指数阻尼按真实经过时间推进；低帧率时不能把每帧裁成 100ms，否则变暗/回正会被拖长数倍。
    const elapsed = motionIdle ? 1 / 60 : Math.min((now - lastDraw) / 1000, 1)
    motionIdle = false
    lastDraw = now
    if (transitionActive && transition) {
      // 入场共用加速后的时钟，镜头、渐显、低头与柱子保持同步；聚焦沿用原速。
      const playbackRate = entranceActive ? ENTRANCE_PLAYBACK_RATE : 1
      transition.totalTime(
        Math.min(
          ((now - motionStart) / 1000) * playbackRate,
          transition.duration()
        )
      )
    }
    // 角度动画仍需绘制，但仅构图变化才更新投影、倒影位置和命中区域。
    const sceneChanged = projectionDirty
    const statueOnly = selected === 'statue'
    const environmentVisible = templeReveal.value > 0
    monuments.visible = environmentVisible
    ground.visible = environmentVisible
    reflection.visible = environmentVisible
    pedestal.visible = environmentVisible
    statueGlow.visible = environmentVisible
    // 回程立即恢复环境深度测试，底座出现时就能遮挡模型，而非等材质淡出结束才恢复。
    chromeMaterial.depthTest = !statueOnly
    chromeMaterial.opacity = 1 - statueView.mix
    // 全不透明时深度测试已处理正反面遮挡，省去透明材质的第二遍模型绘制。
    const singlePass = chromeMaterial.opacity === 1
    if (chromeMaterial.forceSinglePass !== singlePass) {
      chromeMaterial.forceSinglePass = singlePass
      chromeMaterial.needsUpdate = true
    }
    wireMaterial.opacity = statueView.mix
    if (statueMesh) {
      statueMesh.visible = statueView.mix < 1
      statueMesh.renderOrder = statueOnly ? 4 : 0
    }
    if (statueWire) statueWire.visible = statueView.mix > 0
    if (statueWireDepth) statueWireDepth.visible = statueView.mix > 0
    const followHead = !entranceActive && !returningStatue
    if (focusedObelisk && rig.enabled) {
      // 从当前世界坐标计算朝向，运镜和柱子推进时连续追踪；限制转角保护颈部形变。
      const yaw = THREE.MathUtils.clamp(
        Math.atan2(
          focusedObelisk.group.position.x - statue.position.x,
          focusedObelisk.group.position.z - statue.position.z
        ),
        -THREE.MathUtils.degToRad(rig.focusYawLimit),
        THREE.MathUtils.degToRad(rig.focusYawLimit)
      )
      headTarget.set(
        yaw / Math.max((rig.pointerYaw * Math.PI) / 180, 0.001),
        -rig.restPitch / Math.max(rig.pointerPitch, 0.001)
      )
    }
    if (simpleEntrance && entranceActive && focusedObelisk)
      headCurrent.copy(headTarget)
    if (followHead) {
      if (reducedMotion) headCurrent.copy(headTarget)
      else if (headFocusMotion.progress < 1)
        headCurrent.lerpVectors(
          headFocusStart,
          headTarget,
          headFocusMotion.progress
        )
      else
        headCurrent.lerp(
          headTarget,
          1 - Math.exp(-elapsed * (focusedObelisk ? 4 : rig.pointerDamping))
        )
    }
    let moving =
      followHead && headCurrent.distanceToSquared(headTarget) > 0.000001
    if (!moving && followHead) headCurrent.copy(headTarget)
    if (statueOnly) {
      const yaw = THREE.MathUtils.degToRad(pointerTarget.x * rig.bodyYaw)
      statue.rotation.y = THREE.MathUtils.damp(
        statue.rotation.y,
        yaw,
        8,
        elapsed
      )
      statue.rotation.z = 0
      moving ||= Math.abs(statue.rotation.y - yaw) > 0.00001
    }
    headAngles.set(
      THREE.MathUtils.degToRad(
        rig.enabled ? rig.restPitch + headCurrent.y * rig.pointerPitch : 0
      ),
      THREE.MathUtils.degToRad(
        rig.enabled ? headCurrent.x * rig.pointerYaw : 0
      ),
      0
    )
    headQuaternion.setFromEuler(headAngles)
    headNodAngle.value = THREE.MathUtils.degToRad(entranceHeadDip.value)
    headRotation.value.set(
      headQuaternion.x,
      headQuaternion.y,
      headQuaternion.z,
      headQuaternion.w
    )
    if (sceneChanged) {
      camera.lookAt(lookAt)
      camera.updateMatrixWorld()
      ground.rotation.y = Math.atan2(
        camera.position.x - lookAt.x,
        camera.position.z - lookAt.z
      )
      // 模型、底座、地面光与倒影共用同一纵深，运镜期间同步更新，避免倒影脱离实体。
      pedestal.position.z = statue.position.z
      reflectedPedestal.position.copy(pedestal.position)
      statueGlow.position.z = statue.position.z + 1
      statueLight.position.z = statue.position.z + 3
      const yaw = ground.rotation.y
      statueHolyLight.rotation.y = yaw
      statueHolyLight.position.set(
        statue.position.x - Math.sin(yaw) * 1.65,
        6.5,
        statue.position.z - Math.cos(yaw) * 1.65
      )
      reflectedStatue?.position.copy(statue.position)
      for (const [index, item] of obelisks.entries()) {
        reflectedObelisks[index].position.copy(item.group.position)
        reflectedShafts[index].position.copy(item.shaft.position)
        reflectedShafts[index].visible = item.shaft.visible
      }
      monuments.updateMatrixWorld(true)
      statue.updateMatrixWorld(true)
    }
    // 运镜结束后再检测静止指针，避免过渡期间每帧进行布局命中查询和射线拾取。
    if (hasPointer && sceneChanged && !cameraMoving) {
      const target = document.elementFromPoint(lastPointer.x, lastPointer.y)
      const hit = isSceneTarget(target)
        ? raycast(
            { clientX: lastPointer.x, clientY: lastPointer.y },
            true,
            true
          )
        : undefined
      hovered = hit === 'statue' ? null : hit || null
      syncStatueCursor(hit, target)
    }
    statueHolyLight.visible =
      environmentVisible &&
      statueHolyLight.material.uniforms.intensity.value > 0
    const statueHoverTarget =
      statueHovered && !selected && !entranceActive ? 1 : 0
    statueHover.value = THREE.MathUtils.damp(
      statueHover.value,
      statueHoverTarget,
      7,
      elapsed
    )
    let hoverMoving = Math.abs(statueHover.value - statueHoverTarget) > 0.001
    if (!hoverMoving) statueHover.value = statueHoverTarget
    statueHolyLight.scale.set(
      1 + statueHover.value * 0.3,
      1 + statueHover.value * 0.08,
      1
    )
    const environmentHoverTarget = hovered || focusedObelisk ? 1 : 0
    environmentHover.value = THREE.MathUtils.damp(
      environmentHover.value,
      environmentHoverTarget,
      4,
      elapsed
    )
    if (Math.abs(environmentHover.value - environmentHoverTarget) > 0.001)
      hoverMoving = true
    else environmentHover.value = environmentHoverTarget
    const environmentBrightness = 1 - environmentHover.value * 0.58
    // 每帧从主题缓动的基色恢复，再叠加悬停；退出 hover 不会留下颜色或亮度残值。
    for (const entry of tintTargets)
      entry.color.copy(entry.current).multiplyScalar(environmentBrightness)
    ambient.intensity = 0.65 * environmentBrightness
    key.intensity = 1.6 * environmentBrightness
    rim.intensity = 2.8 * environmentBrightness
    statueLight.intensity = 42 * environmentBrightness
    chromeMaterial.envMapIntensity =
      (1.8 + statueHover.value * 0.8) * environmentBrightness
    chromeMaterial.clearcoat = 0.45 + statueHover.value * 0.25
    for (const [index, item] of obelisks.entries()) {
      const hoverTarget =
        hovered === item.category.id ||
        focusedObelisk?.category.id === item.category.id
          ? 1
          : 0
      item.hoverStrength = THREE.MathUtils.damp(
        item.hoverStrength,
        hoverTarget,
        4,
        elapsed
      )
      if (Math.abs(item.hoverStrength - hoverTarget) > 0.001) hoverMoving = true
      else item.hoverStrength = hoverTarget
      const brightness =
        1 - (environmentHover.value - item.hoverStrength) * 0.58
      for (const entry of obeliskTints[index])
        entry.base.color
          .copy(entry.base.current)
          .lerp(entry.target, item.hoverStrength)
          .multiplyScalar(brightness)
      item.surface.envMapIntensity = 0.55 * brightness
      item.baseMaterial.envMapIntensity = 0.6 * brightness
      item.crystal.envMapIntensity = 0.65 * brightness
      // 降低均匀自发光，让各切面的漫反射与高光差异在圣光下仍可辨认。
      item.surface.emissiveIntensity =
        0.025 + item.strength * 0.045 + item.hoverStrength * 0.09
      item.crystal.emissiveIntensity =
        0.38 + Math.max(item.strength, item.hoverStrength) * 0.7
      ;(item.core.material as THREE.MeshBasicMaterial).opacity =
        0.24 + item.hoverStrength * 0.12
      item.edge.opacity = 0.48 + item.strength * 0.5 + item.hoverStrength * 0.16
      item.capHaloMaterial.opacity = item.hoverStrength * 0.65
      item.capHalo.visible = item.hoverStrength > 0
      item.capHalo.scale.set(
        2.6 + item.hoverStrength * 0.4,
        2.8 + item.hoverStrength * 0.4,
        1
      )
      item.labelMaterial.color.setScalar(brightness)
      item.glowMaterial.opacity = 0.3
      // 悬停提亮晶体与周围扩散光；聚焦顶光维持原亮度的 50%。
      const illumination = item.strength * 0.5
      item.beamMaterial.uniforms.intensity.value = illumination
      item.poolMaterial.opacity = illumination * 0.8
      item.beam.visible = illumination > 0
      item.pool.visible = illumination > 0
      item.spot.intensity = illumination * 55
      item.spot.position.set(
        item.group.position.x,
        12,
        item.group.position.z + 0.6
      )
      item.spot.target.position.set(
        item.group.position.x,
        1,
        item.group.position.z
      )
    }
    for (const { source, copy } of reflectionMaterials) {
      copy.color.copy(source.color)
      copy.emissive.copy(source.emissive)
      copy.emissiveIntensity = source.emissiveIntensity
      copy.envMapIntensity = source.envMapIntensity
    }
    for (const entry of reflectionColors) entry.copy.copy(entry.source)
    // 诊断属性不参与视觉绘制；限频发布，关键状态与静止末帧立即同步。
    if (
      diagnosticsDirty ||
      now - lastDiagnosticAt >= DIAGNOSTIC_INTERVAL ||
      !(moving || transitionActive || hoverMoving)
    ) {
      lastDiagnosticAt = now
      diagnosticsDirty = false
      setStageData('templeReveal', templeReveal.value.toFixed(3))
      setStageData('statueHolyScale', statueHolyLight.scale.x.toFixed(3))
      setStageData('statueDepthTest', String(chromeMaterial.depthTest))
      setStageData('statueSheen', chromeMaterial.envMapIntensity.toFixed(3))
      setStageData('statueColor', `#${chromeMaterial.color.getHexString()}`)
      setStageData(
        'statueBodyRotation',
        statue.rotation.toArray().slice(0, 3).join(',')
      )
      setStageData('statueZ', String(statue.position.z))
      setStageData('statueY', statue.position.y.toFixed(4))
      setStageData('statueFullY', statueFullY.toFixed(4))
      setStageData(
        'materialPhase',
        statueView.mix === 1 ? 'wireframe' : 'chrome'
      )
      setStageData('statueWireOpacity', statueView.mix.toFixed(3))
      setStageData('statueClipHeight', String(-statueClipPlane.constant))
      setStageData(
        'statueHolyLight',
        statueHolyLight.material.uniforms.intensity.value.toFixed(3)
      )
      setStageData('headNodAngle', entranceHeadDip.value.toFixed(3))
      setStageData(
        'baseY',
        obelisks.map((item) => item.group.position.y.toFixed(3)).join(',')
      )
      setStageData(
        'shaftBaseGap',
        String(
          (obelisks[0].body.position.y - 2.275 - OBELISK_BASE_TOP) *
            OBELISK_SCALE.y
        )
      )
      setStageData(
        'headRotation',
        headRotation.value
          .toArray()
          .map((value) => value.toFixed(6))
          .join(',')
      )
      setStageData('hovered', hovered || 'none')
      setStageData('environmentBrightness', environmentBrightness.toFixed(3))
      setStageData(
        'headAim',
        focusedObelisk?.category.id || (returningPillar ? 'center' : 'pointer')
      )
      setStageData('headTurnProgress', headFocusMotion.progress.toFixed(3))
      setStageData(
        'bodyColors',
        obelisks
          .map((item) => `#${item.surface.color.getHexString()}`)
          .join(',')
      )
      setStageData(
        'capColors',
        obelisks
          .map((item) => `#${item.crystal.emissive.getHexString()}`)
          .join(',')
      )
      setStageData(
        'capGlow',
        obelisks
          .map((item) => item.crystal.emissiveIntensity.toFixed(3))
          .join(',')
      )
      setStageData(
        'capHalo',
        obelisks
          .map((item) => item.capHaloMaterial.opacity.toFixed(3))
          .join(',')
      )
      setStageData(
        'topLight',
        obelisks
          .map((item) => item.beamMaterial.uniforms.intensity.value.toFixed(3))
          .join(',')
      )
    }
    drawScene()
    // 头部跟随和晶体悬停不会改变柱子轮廓，只有镜头、建筑移动或窗口缩放时更新点击区域。
    if (sceneChanged) {
      projectButtons()
      screenPoint
        .set(0, -0.012, horizonZ)
        .applyMatrix4(ground.matrixWorld)
        .project(camera)
      // 标题贴合真实地平线投影；只在运镜或尺寸改变时写入位置，静止后无额外循环。
      const horizonY = ((0.5 - screenPoint.y * 0.5) * viewHeight).toFixed(2)
      if (
        stage.style.getPropertyValue('--temple-horizon-y') !== `${horizonY}px`
      )
        stage.style.setProperty('--temple-horizon-y', `${horizonY}px`)
      projectionDirty = false
      setStageData(
        'monumentZ',
        obelisks.map((item) => item.group.position.z.toFixed(3)).join(',')
      )
      setStageData(
        'monumentYaw',
        obelisks
          .map((item) =>
            THREE.MathUtils.radToDeg(item.group.rotation.y).toFixed(1)
          )
          .join(',')
      )
      setStageData(
        'cameraPosition',
        camera.position
          .toArray()
          .map((value) => value.toFixed(4))
          .join(',')
      )
      setStageData(
        'cameraTarget',
        lookAt
          .toArray()
          .map((value) => value.toFixed(4))
          .join(',')
      )
      setStageData('cameraFov', String(camera.fov))
      setStageData(
        'visibleObelisks',
        obelisks
          .filter((item) => monuments.visible && item.shaft.visible)
          .map((item) => item.category.id)
          .join(',')
      )
      setStageData('statueVisible', String(statue.visible))
      setStageData(
        'monumentY',
        obelisks.map((item) => item.shaft.position.y.toFixed(3)).join(',')
      )
    }
    // 先实际渲染默认朝向，再恢复头部鼠标跟随；回正期间的鼠标输入不参与角度计算。
    if (returningPillar && headFocusMotion.progress === 1 && !moving) {
      returningPillar = false
      diagnosticsDirty = true
      invalidate()
    }
    if (moving || transitionActive || hoverMoving) invalidate()
    else motionIdle = true
  }
  function invalidate() {
    if (frame === undefined && canRender())
      frame = requestAnimationFrame(render)
  }
  const focusPose = (category: (typeof categories)[number]) => {
    const side = Math.sign(category.x)
    const distance =
      (6.1 * OBELISK_SCALE.y) /
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.68)
    const yaw = -side * THREE.MathUtils.degToRad(category.z < 0 ? 27.5 : 17.5)
    const pitch = THREE.MathUtils.degToRad(FOCUS_LOOK_UP_DEGREES)
    // 围绕碑身中心降低机位并仰视，仍按同一距离和左右偏移构图；位置与视点一起缓动。
    const forward = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    )
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw))
    const offset =
      side *
      (category.z > 0
        ? config.scene.focus.outerPlacement
        : config.scene.focus.innerPlacement) *
      distance *
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
      camera.aspect
    // 先按内侧 1/4、3/4 屏、外侧更靠边构图，再统一偏移投影；碑身高度保持 68%。
    const position = new THREE.Vector3(
      category.x,
      3.045 * OBELISK_SCALE.y,
      category.z + (category.z < 0 ? INNER_OBELISK_ADVANCE : 0)
    )
      .addScaledVector(forward, -distance)
      .addScaledVector(right, -offset)
    return {
      position,
      target: position.clone().addScaledVector(forward, distance),
    }
  }
  const fullStatuePose = () => {
    const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distance =
      (Math.max(statueSize.y, statueSize.x / camera.aspect) /
        (2 * halfFov * 0.8) +
        statueSize.z / 2) /
      STATUE_PREVIEW_SCALE
    const target = new THREE.Vector3(0, statueSize.y / 2, statueZ)
    return {
      position: target.clone().add(new THREE.Vector3(0, 0, distance)),
      target,
    }
  }
  const selectedPose = () => {
    if (selected === 'statue') return fullStatuePose()
    return focusedObelisk
      ? focusPose(focusedObelisk.category)
      : { position: homePosition, target: homeTarget }
  }
  const entranceProgress = { value: 0 }
  const entranceStart = new THREE.Vector3()
  const applyEntranceCamera = () => {
    // 单段中轴线下移：从轻微俯视平滑落到默认机位，无横移、折返或额外推进。
    entranceStart.set(0, 5.6, homePosition.z)
    camera.position
      .copy(entranceStart)
      .lerp(homePosition, entranceProgress.value)
    lookAt.copy(homeTarget)
    projectionDirty = true
  }
  const startEntrance = () => {
    if (simpleEntrance) {
      if (heroEntranceText)
        gsap.set(heroEntranceText, { yPercent: 0, opacity: 1 })
      statueHolyLight.material.uniforms.intensity.value = 1
      entranceHeadDip.value = headNodDegrees
      // 在渐显前设置目标机位；快速入口不播放默认机位到柱子的二次运镜。
      callbacks.ready()
      entranceActive = true
      transitionActive = true
      setStageData('entrancePhase', 'fade')
      motionStart = performance.now()
      transition = gsap
        .timeline({
          paused: true,
          onUpdate: invalidate,
          onComplete: () => {
            entranceActive = false
            transitionActive = false
            projectionDirty = true
            setStageData('entranceFinished', 'true')
            setStageData('entrancePhase', 'complete')
            syncActivity()
            invalidate()
          },
        })
        .to(stage, {
          opacity: 1,
          duration: reducedMotion ? 0.01 : 0.65,
          ease: 'power2.out',
        })
      return
    }
    if (reducedMotion) {
      stage.style.opacity = '1'
      if (heroEntranceText)
        gsap.set(heroEntranceText, { yPercent: 0, opacity: 1 })
      statueHolyLight.material.uniforms.intensity.value = 1
      entranceHeadDip.value = headNodDegrees
      setStageData('entranceFinished', 'true')
      setStageData('entrancePhase', 'complete')
      callbacks.ready()
      return
    }
    entranceActive = true
    transitionActive = true
    setStageData('entrancePhase', 'statue')
    applyEntranceCamera()
    for (const [index, item] of obelisks.entries()) {
      item.shaft.position.y = -OBELISK_ENTRANCE_DEPTH
      item.shaft.visible = false
      reflectedShafts[index].visible = false
    }
    transition = gsap.timeline({
      paused: true,
      onUpdate: invalidate,
      onComplete: () => {
        entranceActive = false
        transitionActive = false
        camera.position.copy(homePosition)
        lookAt.copy(homeTarget)
        headTarget.copy(pointerTarget)
        projectionDirty = true
        setStageData('entranceFinished', 'true')
        setStageData('entrancePhase', 'complete')
        callbacks.ready()
        syncActivity()
        invalidate()
      },
    })
    transition.to(stage, { opacity: 1, duration: 2, ease: 'power2.out' }, 0)
    if (heroEntranceText)
      transition.to(
        heroEntranceText,
        {
          yPercent: 0,
          opacity: 1,
          duration: ENTRANCE_DURATION,
          ease: 'sine.inOut',
        },
        0
      )
    // 圣光比内侧柱子晚 600ms 渐亮，共用时间轴，并在柱子入场结束时达到完整强度。
    transition.to(
      statueHolyLight.material.uniforms.intensity,
      {
        value: 1,
        duration:
          OUTER_PILLAR_ENTRANCE_DELAY +
          PILLAR_ENTRANCE_DURATION -
          HOLY_LIGHT_ENTRANCE_DELAY,
        ease: 'sine.inOut',
      },
      HOLY_LIGHT_ENTRANCE_DELAY
    )
    transition.to(
      entranceHeadDip,
      {
        value: headNodDegrees,
        duration: ENTRANCE_DURATION / 2,
        ease: 'sine.inOut',
      },
      ENTRANCE_DURATION / 2
    )
    transition.to(
      entranceProgress,
      {
        value: 1,
        duration: ENTRANCE_DURATION,
        ease: 'sine.inOut',
        onUpdate: applyEntranceCamera,
      },
      0
    )
    for (const [index, item] of obelisks.entries()) {
      const delay =
        item.category.z < 0
          ? INNER_PILLAR_ENTRANCE_DELAY
          : OUTER_PILLAR_ENTRANCE_DELAY
      moveShaft(transition, index, 0, PILLAR_ENTRANCE_DURATION, delay, () =>
        setStageData('entrancePhase', 'pillars')
      )
    }
    motionStart = performance.now()
    if (document.hidden || !sceneActive) pausedAt = motionStart
  }
  const resize = () => {
    viewWidth = stage.clientWidth
    viewHeight = stage.clientHeight
    if (!viewWidth || !viewHeight) return
    updateDrawingBuffer()
    camera.aspect = viewWidth / viewHeight
    // 偏移投影而非页面容器，场景、倒影和投影点击区域一起下移，导航及离场几何保持原位。
    applyViewOffset()
    homePosition.z = Math.max(
      config.scene.homeCamera.minDistance,
      config.scene.homeCamera.aspectDistance / camera.aspect
    )
    if (entranceActive) applyEntranceCamera()
    else if (!transitionActive) {
      const pose = selectedPose()
      camera.position.copy(pose.position)
      lookAt.copy(pose.target)
    }
    camera.updateProjectionMatrix()
    projectionDirty = true
    pointerBoundsDirty = true
    setStageData('maxRenderPixels', String(MAX_RENDER_PIXELS))
    invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(stage)
  resize()

  let selectionRevision = 0
  let menuExitPending = false
  const select = (
    id: TempleSelection | null,
    immediate = false,
    menuExited = false
  ) => {
    if (!ready || disposed || entranceActive) return
    if (id && id !== 'statue' && !obeliskById.get(id)?.category.enabled) return
    const next = selected === id ? null : id
    if (next === selected) return
    if (menuExitPending && !next && !menuExited) return
    const revision = ++selectionRevision
    const wasStatue = selected === 'statue'
    const wasPillar = !!selected && !wasStatue
    if (wasPillar && !next && !immediate && !menuExited) {
      const menuExit = callbacks.beforeReturn()
      if (menuExit) {
        menuExitPending = true
        // 菜单完全退场后才修改聚焦、主题和回程时间轴；新选择会使旧回程失效。
        void menuExit.then(() => {
          if (disposed || revision !== selectionRevision) return
          menuExitPending = false
          select(null, immediate, true)
        })
        return
      }
    }
    menuExitPending = false
    selected = next
    focusedObelisk =
      next && next !== 'statue' ? obeliskById.get(next) : undefined
    projectionDirty = true
    diagnosticsDirty = true
    cameraMoving = true
    hovered = null
    statueHovered = false
    cursorStateStore.setInteractive(statueCursorSource, false)
    returningPillar = wasPillar && !selected
    headFocusStart.copy(headCurrent)
    headFocusMotion.progress =
      (selected && selected !== 'statue') || wasPillar ? 0 : 1
    returningStatue = wasStatue && !selected
    if (selected === 'statue') headTarget.copy(pointerTarget)
    if (returningPillar) {
      pointerTarget.set(0, 0)
      headTarget.set(0, 0)
    } else if (!selected && !returningStatue) headTarget.copy(pointerTarget)
    callbacks.select(selected)
    transition?.kill()
    const item = focusedObelisk
    const duration = reducedMotion || immediate ? 0.01 : 1.65
    const returnDelay = returningStatue && !reducedMotion ? 0.4 : 0
    const root = stage.closest<HTMLElement>('.temple-page')
    if (selected === 'statue' || wasStatue)
      root?.setAttribute(
        'data-statue-transition',
        selected === 'statue' ? 'enter' : 'exit'
      )
    // 点击即解除下半身裁切；回程裁切与模型下降同步，避免结束时突然截断。
    if (selected === 'statue')
      statueClipPlane.constant = Math.max(0.1, statueFullY - statueHalfY + 0.1)
    transitionActive = true
    motionStart = performance.now()
    transition = gsap.timeline({
      paused: true,
      onUpdate: invalidate,
      onComplete: () => {
        transitionActive = false
        returningStatue = false
        if (!selected && !returningPillar) headTarget.copy(pointerTarget)
        statueClipPlane.constant = selected === 'statue' ? 0.1 : -0.52
        root?.removeAttribute('data-statue-transition')
        const pose = selectedPose()
        if (
          camera.position.distanceToSquared(pose.position) > 1e-10 ||
          lookAt.distanceToSquared(pose.target) > 1e-10
        )
          projectionDirty = true
        camera.position.copy(pose.position)
        lookAt.copy(pose.target)
        invalidate()
      },
    })
    // 头部使用完整时长的角度插值；视角完成独立通知内容挂载，不等待转头或导航渐显。
    transition.to(
      headFocusMotion,
      {
        progress: 1,
        duration: item || wasPillar ? duration * 2 : duration,
        ease: 'power2.inOut',
      },
      0
    )
    transition.call(
      () => {
        cameraMoving = false
        diagnosticsDirty = true
        callbacks.settled()
      },
      [],
      returnDelay + duration
    )
    transition.to(
      entranceHeadDip,
      {
        value: item ? 0 : headNodDegrees,
        duration: item || wasPillar ? duration * 2 : duration,
        ease: 'power2.inOut',
      },
      0
    )
    if (returningStatue) {
      transition.to(
        headCurrent,
        {
          x: 0,
          y: 0,
          duration: returnDelay || duration,
          ease: 'power2.inOut',
        },
        0
      )
      transition.to(
        entranceHeadDip,
        {
          value: headNodDegrees,
          duration: returnDelay || duration,
          ease: 'power2.inOut',
        },
        0
      )
      transition.to(
        statue.rotation,
        { y: 0, z: 0, duration: returnDelay || duration, ease: 'power2.inOut' },
        0
      )
    }
    transition.to(
      templeReveal,
      {
        value: selected === 'statue' ? 0 : 1,
        duration: Math.min(0.55, duration),
        ease: 'none',
        onUpdate: markProjectionDirty,
      },
      returnDelay
    )
    transition.to(
      glitchTime,
      { value: glitchTime.value + duration, duration, ease: 'none' },
      returnDelay
    )
    const heroTitle = stage.querySelector<HTMLElement>('.temple-backdrop')
    transition.to(
      statueHolyLight.material.uniforms.intensity,
      {
        value: selected ? 0 : 1,
        duration: Math.min(0.45, duration),
        ease: 'power2.out',
      },
      returnDelay
    )
    if (heroTitle)
      transition.to(
        heroTitle,
        {
          opacity: selected ? 0.2 : 1,
          duration: duration * 0.65,
          ease: 'power2.out',
        },
        returnDelay
      )
    const pose = selectedPose()
    transition.to(
      statueView,
      { mix: selected === 'statue' ? 1 : 0, duration, ease: 'power2.inOut' },
      returnDelay
    )
    transition.to(
      statueClipPlane,
      {
        constant: selected === 'statue' ? 0.1 : -0.52,
        duration,
        ease: 'power3.inOut',
      },
      returnDelay
    )
    transition.to(
      focusFraming,
      {
        x: item
          ? Math.sign(item.category.x) * config.scene.focus.screenOffset
          : 0,
        y: selected === 'statue' ? STATUE_PREVIEW_VERTICAL_OFFSET : 0,
        duration,
        ease: 'power3.inOut',
        onUpdate: applyViewOffset,
      },
      returnDelay
    )
    transition.to(
      camera.position,
      {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
        duration,
        ease: 'power3.inOut',
        onUpdate: markProjectionDirty,
      },
      returnDelay
    )
    transition.to(
      lookAt,
      {
        x: pose.target.x,
        y: pose.target.y,
        z: pose.target.z,
        duration,
        ease: 'power3.inOut',
        onUpdate: markProjectionDirty,
      },
      returnDelay
    )
    transition.to(
      statue.position,
      {
        y: selected === 'statue' ? statueFullY : statueHalfY,
        z: statueZ - (item && item.category.z < 0 ? INNER_STATUE_RETREAT : 0),
        duration,
        ease: 'power3.inOut',
        onUpdate: markProjectionDirty,
      },
      returnDelay
    )
    for (const [index, obelisk] of obelisks.entries()) {
      transition.to(
        obelisk.group.position,
        {
          z:
            obelisk.category.z +
            (obelisk === item && obelisk.category.z < 0
              ? INNER_OBELISK_ADVANCE
              : 0),
          duration,
          ease: 'power3.inOut',
          onUpdate: markProjectionDirty,
        },
        returnDelay
      )
      transition.to(
        obelisk,
        {
          strength: obelisk === item ? 1 : 0,
          duration: duration * 0.65,
          ease: 'power2.out',
        },
        returnDelay
      )
      moveShaft(
        transition,
        index,
        !item || obelisk === item ? 0 : -OBELISK_ENTRANCE_DEPTH,
        duration,
        returnDelay
      )
    }
    if (immediate) {
      headCurrent.copy(headTarget)
      transition.progress(1)
    }
    invalidate()
  }
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  // 不可用模块仍支持晶体悬停；select 独立检查可用性，禁止进入内容。
  const hitObjects = obelisks.flatMap((item) =>
    [item.body, item.cap].map((object) => ({
      object,
      enabled: item.category.enabled,
    }))
  )
  const intersections: THREE.Intersection[] = []
  const visibleHitObjects: THREE.Object3D[] = []
  const raycast = (
    event: Pick<MouseEvent, 'clientX' | 'clientY'>,
    includeStatue = false,
    hoverOnly = false
  ) => {
    if (entranceActive) return
    // 入场缩放期间实时读取；稳定后缓存边界，指针采样不再反复触发布局计算。
    const entering = !!stage.closest('.route-enter-active')
    if (pointerBoundsDirty || entering || !pointerBounds) {
      pointerBounds = renderer.domElement.getBoundingClientRect()
      pointerBoundsDirty = entering
    }
    const bounds = pointerBounds
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1
    )
    raycaster.setFromCamera(pointer, camera)
    intersections.length = 0
    visibleHitObjects.length = 0
    if (selected !== 'statue')
      for (const { object, enabled } of hitObjects) {
        if (object.parent?.visible && (hoverOnly || enabled))
          visibleHitObjects.push(object)
      }
    if (includeStatue && statueMesh) visibleHitObjects.push(statueMesh)
    const hit = raycaster
      .intersectObjects(visibleHitObjects, false, intersections)
      .find(
        (hit) =>
          hit.point.y >=
          (hit.object === statueMesh
            ? -statueClipPlane.constant
            : OBELISK_BASE_TOP * OBELISK_SCALE.y) -
            0.001
      )
    if (!hit) return
    return hit.object === statueMesh
      ? 'statue'
      : (hit.object.userData.category as TempleCategoryId)
  }
  const click = (event: MouseEvent) => {
    if (selected === 'statue') return select(null)
    const id = raycast(event, true)
    if (id === 'statue') select(selected ? null : 'statue')
    else if (id) select(id)
    else if (selected) select(null)
  }
  renderer.domElement.addEventListener('click', click)
  renderer.domElement.tabIndex = 0
  const modelKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' && event.key !== 'Enter' && event.key !== ' ')
      return
    if (document.querySelector('.about-overlay')) return
    // 弹窗拥有 Esc 的优先权，关闭作品详情时不能同时退出神殿聚焦。
    if (
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '.el-dialog, .el-message-box, .el-image-viewer__wrapper'
        )
      ).some((element) => element.getClientRects().length > 0)
    )
      return
    if (event.key === 'Escape' && selected) select(null)
    else if (
      event.target === renderer.domElement &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault()
      select(selected ? null : 'statue')
    }
  }
  document.addEventListener('keydown', modelKeydown)
  const follow = (event: PointerEvent) => {
    if (!canRender()) return
    hasPointer = true
    lastPointer.set(event.clientX, event.clientY)
    if (!returningPillar)
      pointerTarget
        .set(
          (event.clientX / innerWidth - 0.5) * 2,
          (event.clientY / innerHeight - 0.5) * 2
        )
        .clampScalar(-1, 1)
    const hit =
      !cameraMoving && isSceneTarget(event.target)
        ? raycast(event, true, true)
        : undefined
    syncStatueCursor(hit, event.target)
    const nextHover = hit === 'statue' ? null : hit || null
    const hoverChanged = hovered !== nextHover
    hovered = nextHover
    if (
      (!selected || selected === 'statue') &&
      !entranceActive &&
      !returningStatue &&
      !returningPillar
    )
      headTarget.copy(pointerTarget)
    if (!selected || selected === 'statue' || hoverChanged) invalidate()
  }
  let unsubscribe: (() => void) | undefined
  const syncActivity = () => {
    if (disposed) return
    if (!isSceneActive()) {
      motionIdle = true
      cursorStateStore.setInteractive(statueCursorSource, false)
      themeTransition?.pause()
      unsubscribe?.()
      unsubscribe = undefined
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = undefined
      if (!pausedAt) pausedAt = performance.now()
    } else {
      themeTransition?.resume()
      if (ready && !unsubscribe)
        unsubscribe = subscribePointerSamples(follow, 1000 / 30)
      if (pausedAt && transitionActive)
        motionStart += performance.now() - Math.max(pausedAt, motionStart)
      pausedAt = 0
      invalidate()
    }
  }
  document.addEventListener('visibilitychange', syncActivity)
  const resetPointer = () => {
    hasPointer = false
    pointerTarget.set(0, 0)
    if (
      (!selected || selected === 'statue') &&
      !returningStatue &&
      !returningPillar
    )
      headTarget.copy(pointerTarget)
    statueHovered = false
    hovered = null
    cursorStateStore.setInteractive(statueCursorSource, false)
    invalidate()
  }
  document.documentElement.addEventListener('pointerleave', resetPointer)
  window.addEventListener('blur', resetPointer)

  const prepareRendering = async () => {
    camera.lookAt(lookAt)
    camera.updateMatrixWorld()
    // 模型与倒影在开放交互前完成预编译和纹理上传，聚焦只改变镜头与可见性。
    await renderer.compileAsync(scene, camera)
    if (disposed) return
    // 实际绘制会初始化局部裁切状态，先预热双遍的完整裁切变体。
    renderer.render(scene, camera)
    // 同时预热不透明单遍和透明双遍，避免第一次运镜/网格切换才编译新程序。
    chromeMaterial.forceSinglePass = true
    chromeMaterial.needsUpdate = true
    await renderer.compileAsync(scene, camera)
    if (disposed) return
    renderer.render(scene, camera)
    setStageData('shaderWarmup', 'complete')
  }
  const releaseResources = () => {
    geometries.forEach((value) => value.dispose())
    materials.forEach((value) => value.dispose())
    textures.forEach((value) => value.dispose())
    renderer.dispose()
    renderer.forceContextLoss()
  }

  model
    .load()
    .then(async ({ metadata, buffer, environment, radiance }) => {
      if (disposed) return
      callbacks.progress(60)
      const environmentTexture = texture(
        new THREE.DataTexture(
          new Uint16Array(radiance),
          environment.width,
          environment.height,
          THREE.RGBAFormat,
          THREE.HalfFloatType
        )
      )
      environmentTexture.mapping = THREE.CubeUVReflectionMapping
      environmentTexture.minFilter = THREE.LinearFilter
      environmentTexture.magFilter = THREE.LinearFilter
      environmentTexture.needsUpdate = true
      scene.environment = environmentTexture
      const surface = geometry(new THREE.BufferGeometry())
      for (const [name, source, itemSize] of [
        ['position', 'positions', 3],
        ['normal', 'normals', 3],
        ['headInfluence', 'weights', 1],
        ['headNodInfluence', 'nodWeights', 1],
      ] as const) {
        const attribute = metadata.attributes[source]
        const values = new Float32Array(
          buffer,
          attribute.offset,
          attribute.count
        )
        surface.setAttribute(
          name,
          new THREE.BufferAttribute(
            // 延长颈部只改此场景的顶点副本，避免修改缓存中供其他页面复用的模型。
            source === 'positions'
              ? values.slice()
              : !rig.enabled && itemSize === 1
              ? new Float32Array(values.length)
              : values,
            itemSize
          )
        )
      }
      const indices = metadata.attributes.indices
      surface.setIndex(
        new THREE.BufferAttribute(
          new Uint16Array(buffer, indices.offset, indices.count),
          1
        )
      )
      headPivot.value.fromArray(metadata.headPivot)
      headNodPivot.value.fromArray(metadata.headNodPivot)
      // 按 Head 权重上移：头部整体平移、颈部平滑延长，Neck 根部与躯干保持原位。
      // 加载时一次性处理，倒影复用几何体；低头支点同步抬高，避免重新出现脖子前倾。
      const positions = surface.getAttribute('position')
      const headWeights = surface.getAttribute('headNodInfluence')
      for (let index = 0; index < positions.count; index++)
        positions.setY(
          index,
          positions.getY(index) + neckExtension * headWeights.getX(index)
        )
      headNodPivot.value.y += neckExtension
      const mesh = new THREE.Mesh(surface, chromeMaterial)
      mesh.position.fromArray(metadata.center).multiplyScalar(-1)
      // 半身模型在当前尺寸上放大 10%，裁切面仍与底座台面齐平。
      const cropY = model.cropY
      const modelScale = model.displayHeight / metadata.size[1]
      statue.scale.setScalar(modelScale)
      statue.position.y = 0.52 - (cropY - metadata.center[1]) * modelScale
      statue.add(mesh)
      reflectedStatue = mirror(statue, 0.42)
      // 模型倒影在异步加载后创建，同样加入主题更新，保持镜像色一致。
      reflectedStatue.traverse((object) => {
        if (object instanceof THREE.Mesh)
          trackTint((object.material as THREE.MeshPhysicalMaterial).color)
      })
      setThemeColor(experience.themeColor, false)
      statueMesh = mesh
      surface.computeBoundingBox()
      const bounds = surface.boundingBox!
      bounds.getSize(statueSize).multiplyScalar(modelScale)
      statueHalfY = statue.position.y
      statueFullY = (metadata.center[1] - bounds.min.y) * modelScale
      statueWire = new THREE.Mesh(surface, wireMaterial)
      statueWire.position.copy(mesh.position)
      statueWire.renderOrder = 6
      statue.add(statueWire)
      statueWireDepth = new THREE.Mesh(surface, wireDepthMaterial)
      statueWireDepth.position.copy(mesh.position)
      statueWireDepth.renderOrder = 5
      // 全身预览清空环境深度；回程保留底座深度，让网格与实体一起被底座自然遮挡。
      statueWireDepth.onBeforeRender = () => {
        if (selected === 'statue') renderer.clearDepth()
      }
      statue.add(statueWireDepth)
      installTempleGlitch()
      for (const [name, value] of Object.entries(metadata.stats))
        stage.dataset[name] = String(value)
      stage.dataset.materialPhase = 'chrome'
      preparation = prepareRendering()
      await preparation
      if (disposed) return
      callbacks.progress(100)
      callbacks.prepared()
      setStageData('entrancePhase', 'waiting-route')
      await callbacks.waitForRouteEnter()
      if (disposed) return
      const reveal = () => {
        if (disposed) return
        ready = true
        startEntrance()
        render(performance.now())
        renderer.domElement.style.visibility = 'visible'
        syncActivity()
      }
      reveal()
    })
    .catch((error) => {
      if (!disposed) callbacks.error(error)
    })

  return {
    select,
    pick: click,
    setThemeColor,
    // 页面决定场景是否可见，场景统一管理动画时钟、指针订阅和绘制的暂停/恢复。
    setActive: (active: boolean) => {
      if (sceneActive === active) return
      sceneActive = active
      syncActivity()
    },
    dispose: () => {
      disposed = true
      cursorStateStore.setInteractive(statueCursorSource, false)
      transition?.kill()
      themeTransition?.kill()
      unsubscribe?.()
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncActivity)
      document.removeEventListener('keydown', modelKeydown)
      document.documentElement.removeEventListener('pointerleave', resetPointer)
      window.removeEventListener('blur', resetPointer)
      renderer.domElement.removeEventListener('click', click)
      if (frame !== undefined) cancelAnimationFrame(frame)
      renderer.domElement.remove()
      // Three 的并行编译轮询仍需读取 program；结束后再释放，避免快速离场时访问已销毁资源。
      if (preparation)
        void preparation.finally(releaseResources).catch(() => {})
      else releaseResources()
    },
  }
}
