import { gsap } from 'gsap'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {
  FLORA_LAYOUT_BOTTOM_GAP,
  FLORA_LAYOUT_GAP,
  FLORA_MOBILE_CHARACTER_HEIGHT_RATIO,
  FLORA_MOBILE_FOCUS_SCENE_RISE,
  FLORA_MOBILE_MODEL_HEIGHT_RATIO,
  FLORA_MODEL_CENTER_X,
} from '@/config/floraLayout'
import {
  getTempleSceneVerticalOffset,
  TEMPLE_FOCUS_DURATION,
  templeCamera,
} from '@/config/templeCamera'
import {
  type TempleExperience,
  templeExperience,
} from '@/config/templeExperience'
import { templeLabelLayout } from '@/config/templeLabelLayout'
import { templeLabelQuality } from '@/config/templeLabelQuality'
import { isTempleWireframeModel } from '@/config/templeModelDisplay'
import {
  templeCategories,
  type TempleCategoryId,
} from '@/config/templeNavigation'
import type { TemplePresentation } from '@/config/templePresentation'
import { type PetProfile, pets } from '@/locales/dynamic/pets'
import { cursorState } from '@/stores'
import { cacheMorphRaycastVertices } from '@/utils/cacheMorphRaycastVertices'
import {
  type FloraPetModelAsset,
  loadFloraPetModel,
} from '@/utils/floraPetModel'
import { subscribePointerSamples } from '@/utils/pointerSamples'
import { preloadTempleAssets } from '@/utils/preloadTempleAssets'
import { createSceneMatrixUpdater } from '@/utils/sceneMatrixUpdater'
import type { TempleLabelAsset } from '@/utils/templeLabelModel'
import {
  getTempleLabelCanvas,
  getTempleZodiacMask,
} from '@/utils/templeLabelTextures'

import { createBarycentricGeometry } from './scene/barycentricGeometry'
import { isHomeSceneDiagnosticsEnabled } from './scene/diagnostics'
import {
  createDollyCameraMotion,
  easeIslandFocusZoom,
} from './scene/dollyCamera'
import {
  createObeliskBaseGeometry,
  createObeliskBodyGeometry,
} from './scene/geometry'
import {
  createDizzySticker,
  DIZZY_STICKER_FRAME_MS,
  LUCARIO_HEADACHE_STICKER_RED,
  prepareHeadachePose,
} from './scene/lucarioHeadache'
import {
  installEnvironmentFade,
  installHeadacheTint,
  installHeadRig,
} from './scene/materials'
import { createModelScan } from './scene/modelScan'
import {
  createPetFocusCamera,
  createPetScreenBounds,
} from './scene/petFocusCamera'
import { createPillarBatches } from './scene/pillarBatches'
import { createScreenProjection } from './scene/screenProjection'
import { createShaderWarmup } from './scene/shaderWarmup'
import { createSpotLightPool } from './scene/spotLightPool'
import { createStaticSceneCache } from './scene/staticSceneCache'
import {
  createTempleLabelLod,
  fillTempleLabelGeometry,
} from './scene/templeLabelLod'
import { createThemeTint, type ThemeTintEntry } from './scene/themeTint'
import { createZodiacProjection } from './scene/zodiacProjection'

export type TempleSelection = TempleCategoryId | 'statue' | 'sprigatito'

export interface IslandModelAnchors {
  chest: { x: number; y: number }
  rightHand: { x: number; y: number }
  leftHand: { x: number; y: number }
  rightBraid: { x: number; y: number }
  leftBraid: { x: number; y: number }
}

export interface TempleCallbacks {
  entranceStarted?: () => void
  entrySelection?: () => TempleSelection | null
  waitForRouteEnter: () => Promise<void>
  prepared: () => void
  progress: (value: number) => void
  ready: () => void
  entranceComplete: () => void
  beforeReturn: () => Promise<void> | undefined
  dismissBackground?: () => boolean
  select: (id: TempleSelection | null) => void
  islandAnchors?: (anchors: IslandModelAnchors) => void
  settled: () => void
  error: (error: unknown) => void
}

let referenceRequestId = 0
const MAX_RENDER_PIXELS = 2048 * 2048
const DIAGNOSTIC_INTERVAL = 100
const INNER_OBELISK_ADVANCE = 3
const INNER_STATUE_RETREAT = 5
const OBELISK_SCALE = new THREE.Vector3(1.28, 1.22, 1.28)
const ENTRANCE_SPEED = 1.2
const ENTRANCE_DURATION = 6.8 / ENTRANCE_SPEED
const ENTRANCE_PLAYBACK_RATE = 1.2
const INNER_PILLAR_ENTRANCE_DELAY = 1.1 / ENTRANCE_SPEED
const OUTER_PILLAR_ENTRANCE_DELAY = 1.55 / ENTRANCE_SPEED
const PILLAR_ENTRANCE_DURATION = 3.2
const SIMPLE_ENTRANCE_START =
  INNER_PILLAR_ENTRANCE_DELAY + PILLAR_ENTRANCE_DURATION / 2
const HOLY_LIGHT_ENTRANCE_DELAY =
  INNER_PILLAR_ENTRANCE_DELAY + 0.6 * ENTRANCE_PLAYBACK_RATE
const FOCUS_LOOK_UP_DEGREES = 10
const OBELISK_ENTRANCE_DEPTH = 7.5
const OBELISK_BASE_TOP = 0.34
const HOLY_LIGHT_COLOR = '#E23455'
const IMMERSIVE_HOLY_LIGHT_PERIOD_MS = 8000
const STATUE_ENVIRONMENT_DURATION = 1.6
const STATUE_SCAN_DURATION = 2.2
const STATUE_SCAN_ADVANCE = 0.75
const STATUE_REALIGN_DURATION = 0.25
const STATUE_FOCUS_ZOOM = 1.3
const STATUE_ZOOM_VERTICAL_OFFSET = 0.06
const STATUE_ZOOM_DURATION = 1
const STATUE_ENVIRONMENT_EXPANSION = 0.18
const STATUE_LABEL_TEXT = 'ISLAND'
const STATUE_LABEL_CHARACTER_DURATION = 0.18
const STATUE_LABEL_STAGGER = STATUE_LABEL_CHARACTER_DURATION * 0.5
const STATUE_LABEL_PUSH_DEPTH = 0.75
const STATUE_LABEL_HOVER_DURATION =
  STATUE_LABEL_CHARACTER_DURATION +
  (STATUE_LABEL_TEXT.length - 1) * STATUE_LABEL_STAGGER
const STATUE_LABEL_DOCK_OFFSET = 24
const STATUE_PREVIEW_SCALE = 1.5
const STATUE_PREVIEW_VERTICAL_OFFSET = 0.21
// 聚焦时逐渐拉宽视角，同时由现有 Dolly 运镜补偿距离，保留主体放大和广角透视。
const STATUE_PREVIEW_FOV = 48
const STATUE_PREVIEW_PITCH = 4
// 保留缩头前的宽度基准，避免头部变小后自动放大整个模型。
const SPRIGATITO_REFERENCE_WIDTH = 0.2963257431983948

export function createHomeTemple(
  stage: HTMLElement,
  buttons: Map<string, HTMLElement>,
  callbacks: TempleCallbacks,
  config: TemplePresentation,
  experience: TempleExperience = templeExperience,
  simpleEntrance = false,
  initialPet: PetProfile = pets[0]
) {
  const diagnosticsEnabled = isHomeSceneDiagnosticsEnabled()
  const sceneVerticalOffset = getTempleSceneVerticalOffset(
    config.id === 'mobile'
  )
  let lightMode = false
  let currentPet = initialPet
  let petChangeRevision = 0
  let petFadingOut = false
  let petEntrance: gsap.core.Timeline | undefined
  const { model } = experience
  const rig = model.rig
  const headache = experience.headache
  const headacheEnabled =
    model.id === 'lucario' && headache?.mode === 'headache'
  let headacheMix = headacheEnabled ? 1 : 0
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
    syncStatueLabelTarget(performance.now())
    cursorStateStore.setInteractive(
      statueCursorSource,
      !entranceActive &&
        (hit === 'statue' || hit === 'sprigatito') &&
        target === renderer.domElement
    )
  }
  const isSceneTarget = (target: EventTarget | null) =>
    target === renderer.domElement ||
    (target instanceof Element && !!target.closest('.temple-obelisk'))
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  let hostContextInvalid = false
  const invalidateHostContext = () => {
    hostContextInvalid = true
  }
  renderer.domElement.addEventListener(
    'webglcontextlost',
    invalidateHostContext
  )
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
  let heroEntranceText = stage.querySelector<HTMLElement>('.temple-backdrop h1')
  if (heroEntranceText)
    gsap.set(heroEntranceText, { yPercent: 100, opacity: 0 })
  stage.dataset.entranceFinished = 'false'
  if (diagnosticsEnabled) {
    stage.dataset.maxFps = '60'
    stage.dataset.pointerSampleMs = String(1000 / 30)
  }

  const scene = new THREE.Scene()
  scene.matrixAutoUpdate = false
  const camera = new THREE.PerspectiveCamera(templeCamera.fov, 1, 0.1, 100)
  const lookAt = new THREE.Vector3(
    0,
    templeCamera.targetY,
    templeCamera.targetZ
  )
  const homePosition = new THREE.Vector3(0, templeCamera.homeY, 20)
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
  const applyModelWireframe = (
    mesh: THREE.Mesh,
    surface: THREE.MeshStandardMaterial
  ) => {
    if (!mesh.geometry.morphAttributes.position?.length)
      surface.color.set(HOLY_LIGHT_COLOR)
    // 与路卡相同：先写实体深度，再画三角网格，隐藏背面线条。
    mesh.material = material(
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        transparent: true,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      })
    )
    const wireMaterial = material(
      new THREE.MeshBasicMaterial({
        wireframe: true,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    )
    wireMaterial.color = surface.color
    const wire = new THREE.Mesh(mesh.geometry, wireMaterial)
    wire.position.copy(mesh.position)
    wire.rotation.copy(mesh.rotation)
    wire.scale.copy(mesh.scale)
    wire.renderOrder = mesh.renderOrder + 1
    wire.morphTargetInfluences = mesh.morphTargetInfluences
    mesh.parent!.add(wire)
    return wire
  }
  const texture = <T extends THREE.Texture>(value: T): T => {
    textures.add(value)
    return value
  }
  let disposed = false
  let hosted = false
  let hostRevision = 0
  let ready = false
  let sceneActive = true
  let sceneOccluded = false
  let frame: number | undefined
  let frameContentDirty = true
  let dizzyFrameTimer: ReturnType<typeof setTimeout> | undefined
  let lastDraw = 0
  let motionIdle = true
  let selected: TempleSelection | null = null
  let transition: gsap.core.Timeline | undefined
  let transitionActive = false
  let statueRestorePending = false
  let entranceActive = false
  let entranceCameraActive = false
  let cameraMoving = false
  const entranceHeadDip = { value: 0 }
  let motionStart = 0
  let pausedAt = 0
  let statueHovered = false
  let immersive = false
  let immersionStartedAt = 0
  let immersionTween: gsap.core.Tween | undefined
  const statueHover = { value: 0 }
  const templeReveal = { value: 1 }
  const templeExpansion = { value: 1 }
  let returningStatue = false
  let hovered: TempleCategoryId | 'sprigatito' | null = null
  const lastPointer = new THREE.Vector2()
  let lastPointerEventTarget: EventTarget | null = null
  let hasPointer = false
  let preparation: Promise<void> | undefined
  let shaderWarmup: ReturnType<typeof createShaderWarmup> | undefined
  let prepareInteractions: (() => Promise<void>) | undefined
  let interactionsPrepared = false
  let preparationEntry: TempleSelection | null = null
  let applyingEntrySelection = false
  let projectionDirty = true
  let lastDiagnosticAt = -Infinity
  let diagnosticsDirty = true
  let viewWidth = 0
  let viewHeight = 0
  const focusFraming = { x: 0, y: 0 }
  const floraFraming = () => {
    const offsetX = currentPet.focusOffsetX ?? 0
    if (config.id !== 'mobile')
      return {
        x: FLORA_MODEL_CENTER_X - 0.5 + offsetX,
        y: -sceneVerticalOffset + 0.05,
      }
    // 以导航和页脚之间的实际可用高度构图；模型中心下移少许，为上方编号留空间。
    const stageTop = stage.getBoundingClientRect().top
    const headerBottom =
      document.querySelector('.el-menu-layout-all')?.getBoundingClientRect()
        .bottom ?? stageTop
    const footer = document.querySelector('.footer-com')
    const footerTop =
      footer && getComputedStyle(footer).display !== 'none'
        ? footer.getBoundingClientRect().top
        : stageTop + viewHeight
    const top = headerBottom - stageTop + FLORA_LAYOUT_GAP
    const characterHeight =
      Math.max(
        0,
        footerTop - stageTop - top - FLORA_LAYOUT_BOTTOM_GAP - FLORA_LAYOUT_GAP
      ) * FLORA_MOBILE_CHARACTER_HEIGHT_RATIO
    return {
      x: offsetX,
      y:
        (top + characterHeight * FLORA_MOBILE_MODEL_HEIGHT_RATIO) / viewHeight -
        0.5 -
        sceneVerticalOffset,
    }
  }
  // 位移直接跟随缩放进度，入场同步下移，回程随退镜连续归位。
  const statueZoomDrop = () =>
    THREE.MathUtils.clamp((camera.zoom - 1) / (STATUE_FOCUS_ZOOM - 1), 0, 1) *
    STATUE_ZOOM_VERTICAL_OFFSET
  let viewOffsetDirty = false
  const applyViewOffset = () => {
    if (!viewWidth || !viewHeight) return
    viewOffsetDirty = false
    // 调整相机投影，让雕像、碑身、圣光和倒影整体让出菜单空间；点击投影使用同一相机。
    camera.setViewOffset(
      viewWidth,
      viewHeight,
      -viewWidth * focusFraming.x,
      -viewHeight * (sceneVerticalOffset + focusFraming.y + statueZoomDrop()) +
        (config.id === 'mobile'
          ? FLORA_MOBILE_FOCUS_SCENE_RISE * sprigatitoFocus.value
          : 0),
      viewWidth,
      viewHeight
    )
    projectionDirty = true
  }
  const markViewOffsetDirty = () => {
    viewOffsetDirty = true
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
    if (diagnosticsEnabled) setStageData('renderPixelRatio', String(ratio))
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

  const bodyGeometry = geometry(createObeliskBodyGeometry())
  const capGeometry = geometry(new THREE.ConeGeometry(0.663, 1.05, 4))
  capGeometry.rotateY(Math.PI / 4)
  const baseGeometry = geometry(createObeliskBaseGeometry())
  const capEdges = geometry(new THREE.EdgesGeometry(capGeometry, 25))
  const labelGeometry = geometry(
    new THREE.PlaneGeometry(
      templeLabelLayout.worldWidth,
      templeLabelLayout.worldHeight
    )
  )
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

  const labelSubscriptions: (() => void)[] = []
  const labelTexture = (label: ReturnType<typeof getTempleLabelCanvas>) => {
    const map = texture(new THREE.CanvasTexture(label.canvas))
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    labelSubscriptions.push(
      label.subscribe(() => {
        if (!disposed) {
          map.needsUpdate = true
          staticSceneCache.invalidate()
          invalidate()
        }
      })
    )
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
      new THREE.MeshStandardMaterial({
        color: 0x5a192d,
        vertexColors: true,
        metalness: 0.3,
        roughness: 0.4,
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
      new THREE.MeshStandardMaterial({
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
        forceSinglePass: true,
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
    // 边线在晶体及内芯之后叠加，避免实例批次的对象 ID 改变同深度透明排序。
    capLines.renderOrder = 0.01
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
    group.add(new THREE.Mesh(baseGeometry, baseMaterial))
    if (isTempleWireframeModel(category.id)) {
      applyModelWireframe(body, surface)
      applyModelWireframe(cap, crystal)
      for (const foot of [...group.children])
        if (foot instanceof THREE.Mesh) applyModelWireframe(foot, baseMaterial)
      core.visible = false
      capLines.visible = false
    }
    const labelAccent = { value: new THREE.Color(templeLabelLayout.iconColor) }
    const labelInk = { value: new THREE.Color('#ffffff') }
    const labelMaterial = material(
      new THREE.MeshBasicMaterial({
        map: labelTexture(
          getTempleLabelCanvas(category.title, category.zodiacSign)
        ),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    )
    labelMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.labelAccent = labelAccent
      shader.uniforms.labelInk = labelInk
      shader.fragmentShader =
        'uniform vec3 labelAccent;uniform vec3 labelInk;\n' +
        shader.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
        float accentMask=1.-smoothstep(0.35,0.75,diffuseColor.g/max(diffuseColor.r,0.00001));
        diffuseColor.rgb=mix(diffuseColor.rgb*labelInk,labelAccent,accentMask);`
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
        forceSinglePass: true,
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
      label,
      labelAccent,
      labelInk,
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
  let skyHorizon = '100%'
  const syncSkyClip = () => {
    const bottom =
      ground.visible && sceneActive && !sceneOccluded ? skyHorizon : '100%'
    const rootStyle = document.documentElement.style
    if (rootStyle.getPropertyValue('--temple-sky-bottom') !== bottom)
      rootStyle.setProperty('--temple-sky-bottom', bottom)
  }
  const horizonZ = templeCamera.horizonZ
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
        gl_FragColor=vec4(floorColor,mix(0.92,0.46,distanceFade));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      })
    )
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, templeCamera.horizonY, horizonZ + 80)
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
  horizonGlow.position.set(0, 9 + templeCamera.horizonY, horizonZ)
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
  horizonFallGlow.position.set(0, -9 + templeCamera.horizonY, horizonZ)
  horizonFallGlow.renderOrder = 2
  ground.add(horizonFallGlow)
  const statueZ = -1.8
  const sleepingSprigatito = new THREE.Group()
  let reflectedSprigatito: THREE.Object3D | undefined
  const petReflectionOpacity = config.id === 'mobile' ? 0.18 : 0.34
  // 手机端前排石柱更靠近镜头，将新叶喵适当收小、前移，保留完整睡姿。
  const sprigatitoForwardOffset = config.id === 'mobile' ? 6 : 3.2
  sleepingSprigatito.position.set(
    config.id === 'mobile' ? 1.1 : 1.8,
    0.035,
    statueZ + sprigatitoForwardOffset
  )
  sleepingSprigatito.rotation.y = THREE.MathUtils.degToRad(
    currentPet.rotationY.home
  )
  scene.add(sleepingSprigatito)
  let sprigatitoMesh:
    | THREE.Mesh<
        THREE.BufferGeometry,
        THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial
      >
    | undefined
  let sprigatitoSurface: THREE.MeshPhysicalMaterial | undefined
  let sprigatitoWire: THREE.Mesh | undefined
  let sprigatitoWireDepth: THREE.Mesh | undefined
  let reflectedSprigatitoSurface: THREE.Mesh | undefined
  let reflectedSprigatitoWire: THREE.Mesh | undefined
  let reflectedSprigatitoWireDepth: THREE.Mesh | undefined
  const sprigatitoSize = new THREE.Vector3()
  const sprigatitoHover = { value: 0 }
  const sprigatitoFocus = { value: 0 }
  const sprigatitoPose = { value: 0 }
  const petVisibility = { value: 1 }
  let petMeshes: THREE.Mesh[] = []
  const petHead = new THREE.Vector2()
  const petHeadTarget = new THREE.Vector2()
  const reflectedSprigatitoMeshes: THREE.Mesh[] = []
  const sprigatitoTheme = new THREE.Color(currentPet.themeColor)
  const sprigatitoHoverColor = new THREE.Color()
  const sprigatitoBeamMaterial = material(obelisks[0].beamMaterial.clone())
  sprigatitoBeamMaterial.depthTest = false
  // 独立延长宠物光束，避免首页取景露出光束上端；底端仍贴近地面。
  const petBeamGeometry = geometry(
    new THREE.CylinderGeometry(0.18, 1.7, 64, 32, 1, true)
  )
  const sprigatitoBeam = new THREE.Mesh(petBeamGeometry, sprigatitoBeamMaterial)
  sprigatitoBeam.scale.set(
    0.55 * currentPet.topLight.widthScale,
    0.5,
    0.55 * currentPet.topLight.widthScale
  )
  sprigatitoBeam.position.set(
    sleepingSprigatito.position.x,
    16.05,
    sleepingSprigatito.position.z
  )
  // 路卡先绘制，顶光不被其深度遮挡，花花最后绘制在光束前方。
  sprigatitoBeam.renderOrder = 0.5
  scene.add(sprigatitoBeam)
  const sprigatitoPoolMaterial = material(obelisks[0].poolMaterial.clone())
  const sprigatitoPool = new THREE.Mesh(poolGeometry, sprigatitoPoolMaterial)
  sprigatitoPool.rotation.x = -Math.PI / 2
  sprigatitoPool.scale.setScalar(0.45)
  sprigatitoPool.position.copy(sleepingSprigatito.position)
  sprigatitoPool.position.y = 0.025
  scene.add(sprigatitoPool)
  const sprigatitoSpot = new THREE.SpotLight(
    HOLY_LIGHT_COLOR,
    0,
    12,
    Math.PI / 11,
    0.85,
    1.5
  )
  sprigatitoSpot.position.set(
    sleepingSprigatito.position.x,
    7,
    sleepingSprigatito.position.z + 0.5
  )
  sprigatitoSpot.target.position.copy(sleepingSprigatito.position)
  const spotLightPool = createSpotLightPool(scene, [
    ...obelisks.map((item) => item.spot),
    sprigatitoSpot,
  ])
  const sprigatitoLightColors: THREE.Color[] = [
    sprigatitoBeamMaterial.uniforms.glowColor.value,
    sprigatitoPoolMaterial.color,
    sprigatitoSpot.color,
  ]
  const pedestal = new THREE.Group()
  pedestal.position.z = statueZ
  const pedestalParts = [
    [6.4, 0.14, 0.07],
    [5.8, 0.18, 0.23],
    [5.2, 0.2, 0.42],
  ].map(([width, height, y]) =>
    new THREE.BoxGeometry(width, height, 3.2).translate(0, y, 0)
  )
  pedestal.add(
    new THREE.Mesh(geometry(mergeGeometries(pedestalParts)!), plinthMaterial)
  )
  pedestalParts.forEach((value) => value.dispose())
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
  const statueHolyIntensity = { value: 0 }
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

  // 建筑倒影使用 Basic；角色和底座保留 Standard 的切面明暗，均不使用 Physical 清漆或透明双遍。
  const reflectionMaterials: {
    source: THREE.MeshStandardMaterial
    copy: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
    character: boolean
  }[] = []
  const reflectionColors: { source: THREE.Color; copy: THREE.Color }[] = []
  const immersionLabels = new Set<THREE.Material>(
    obelisks.map((item) => item.labelMaterial)
  )
  const mirror = (
    source: THREE.Object3D,
    opacity: number,
    character = false
  ) => {
    const copy = source.clone(true)
    const mirroredMaterials = new Map<THREE.Material, THREE.Material>()
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
        immersionLabels.has(original) ||
        original instanceof THREE.ShaderMaterial ||
        original.blending === THREE.AdditiveBlending
      ) {
        object.visible = false
        return
      }
      const existing = mirroredMaterials.get(original)
      if (existing) {
        object.material = existing
        return
      }
      const baseSurface =
        original instanceof THREE.MeshStandardMaterial &&
        (object.geometry === baseGeometry || original === plinthMaterial)
      let faded: THREE.Material
      if (original instanceof THREE.MeshStandardMaterial) {
        const surface = {
          color: original.color.clone(),
          map: original.map,
          vertexColors: original.vertexColors,
          side: original.side,
          clippingPlanes: original.clippingPlanes,
        }
        const shaded = character || baseSurface
        faded = material(
          shaded
            ? new THREE.MeshStandardMaterial({
                ...surface,
                metalness: original.metalness,
                roughness: character
                  ? Math.max(0.22, original.roughness)
                  : original.roughness,
                flatShading: original.flatShading,
                envMapIntensity:
                  original.envMapIntensity * (character ? 0.45 : 1),
                emissive: original.emissive.clone(),
                emissiveIntensity:
                  original.emissiveIntensity * (character ? 0.5 : 1),
              })
            : new THREE.MeshBasicMaterial(surface)
        )
      } else faded = material(original.clone())
      faded.forceSinglePass = true
      faded.onBeforeCompile = original.onBeforeCompile
      faded.customProgramCacheKey =
        original.customProgramCacheKey.bind(original)
      mirroredMaterials.set(original, faded)
      faded.transparent = true
      // 底座颜色本身很暗，单独提高镜像覆盖度，避免与地面混合后完全消失。
      faded.opacity = baseSurface ? Math.min(0.68, opacity * 1.8) : opacity
      faded.depthWrite = !original.colorWrite
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
        (faded instanceof THREE.MeshBasicMaterial ||
          faded instanceof THREE.MeshStandardMaterial)
      )
        reflectionMaterials.push({ source: original, copy: faded, character })
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
  const reflectedObelisks = obelisks.map((item) => mirror(item.group, 0.52))
  const immersionLabelOpacity = [...immersionLabels].map((value) => ({
    material: value,
    opacity: value.opacity,
  }))
  const reflectedShafts = reflectedObelisks.map(
    (group) => group.getObjectByName('obelisk-shaft')!
  )
  const zodiacProjectionGeometry = geometry(new THREE.BoxGeometry(1, 1, 1))
  // 终点沿中央视线移向镜头，置于四根方尖碑前方。
  const zodiacProjectionTarget = homeTarget.clone().lerp(homePosition, 0.5)
  zodiacProjectionTarget.y += 0.9
  // 倒影创建后再挂载，光束只从真实碑文发出，不复制到镜像方尖碑。
  const zodiacProjections = obelisks.map((item) => {
    const mask = getTempleZodiacMask(item.category.zodiacSign)
    const glyphMap = texture(
      new THREE.DataTexture(mask.data, mask.size, mask.size, THREE.RedFormat)
    )
    glyphMap.minFilter = glyphMap.magFilter = THREE.LinearFilter
    glyphMap.needsUpdate = true
    const projection = createZodiacProjection(
      zodiacProjectionGeometry,
      zodiacProjectionTarget,
      item.category.themeColor,
      glyphMap
    )
    material(projection.material)
    projection.beam.name = `zodiac-projection-${item.category.id}`
    projection.beam.position.set(
      0,
      templeLabelLayout.worldHeight *
        (0.5 - templeLabelLayout.iconCenterY / templeLabelLayout.height),
      0.012
    )
    item.label.add(projection.beam)
    return projection
  })
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
    if (shaft.position.y === y) return
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
  // 原底座和倒影一起渐隐，保存原透明度，退出聚焦时可从当前帧连续恢复。
  const baseMaterials = new Set<THREE.MeshStandardMaterial>([
    plinthMaterial,
    ...obelisks.map((item) => item.baseMaterial),
  ])
  const fadingBaseMaterials = [
    ...baseMaterials,
    ...reflectionMaterials
      .filter(({ source }) => baseMaterials.has(source))
      .map(({ copy }) => copy),
  ].map((value) => ({
    value,
    opacity: value.opacity,
  }))
  // 淡化期间保持深度写入方式不变；完全透明的片元直接丢弃，避免残留遮挡。
  for (const entry of fadingBaseMaterials) entry.value.alphaTest = 0.0001
  const statueLabelReveal = { value: 0 }
  const statueLabelFocus = { value: 0 }
  let statueLabelTarget = statueLabelReveal.value
  let statueLabelMotionStart = statueLabelReveal.value
  let statueLabelMotionTime = 0
  const syncStatueLabelTarget = (now: number) => {
    const target =
      selected === 'statue' ||
      returningStatue ||
      statueView.mix > 0 ||
      (statueHovered && !selected && !entranceActive)
        ? 1
        : 0
    if (target === statueLabelTarget) return
    statueLabelTarget = target
    statueLabelMotionStart = statueLabelReveal.value
    statueLabelMotionTime = now
  }
  const statueLabelMaterial = material(
    new THREE.MeshBasicMaterial({
      color: experience.themeColor,
      transparent: true,
      opacity: statueLabelReveal.value,
      depthWrite: false,
      toneMapped: false,
    })
  )
  statueLabelMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.statueLabelFocus = statueLabelFocus
    shader.uniforms.statueLabelReveal = statueLabelReveal
    shader.vertexShader =
      'attribute float statueLabelCharacter; uniform float statueLabelReveal; varying float statueLabelProgress; varying vec3 statueLabelNormal;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        statueLabelNormal = normal;
        statueLabelProgress = clamp((statueLabelReveal * ${STATUE_LABEL_HOVER_DURATION} - statueLabelCharacter * ${STATUE_LABEL_STAGGER}) / ${STATUE_LABEL_CHARACTER_DURATION}, 0., 1.);
        transformed.z -= ${STATUE_LABEL_PUSH_DEPTH} * (1. - statueLabelProgress);`
      )
    shader.fragmentShader =
      'uniform float statueLabelFocus; varying float statueLabelProgress; varying vec3 statueLabelNormal;\n' +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if(statueLabelProgress <= 0.) discard;
        diffuseColor.a *= statueLabelProgress;
        // 正面保持原主题色，侧面与倒角按法线压暗；一个材质完成厚度层次。
        diffuseColor.rgb *= 0.2 + 0.8 * max(normalize(statueLabelNormal).z, 0.);
        // 用屏幕像素切出透明横线，镂空区域直接显示后方场景。
        if(mod(gl_FragCoord.y,6.)<2.*statueLabelFocus) discard;`
      )
  }
  statueLabelMaterial.customProgramCacheKey = () =>
    'temple-statue-label-push-v5'
  const statueLabelGeometry = geometry(new THREE.BufferGeometry())
  let statueLabelHalfHeight = 0
  let statueLabelDepth = 0
  let labelLod: ReturnType<typeof createTempleLabelLod> | undefined
  const publishLabelTier = (asset: TempleLabelAsset) => {
    if (!diagnosticsEnabled) return
    setStageData('labelMode', templeLabelQuality)
    setStageData('labelQuality', asset.quality)
    setStageData(
      'labelFaces',
      String(asset.metadata.attributes.indices.count / 3)
    )
    setStageData('labelGeometryBytes', String(asset.buffer.byteLength))
  }
  const statueLabel = new THREE.Mesh(statueLabelGeometry, statueLabelMaterial)
  statueLabel.position.set(0, 0.52 + statueLabelHalfHeight, statueZ + 1.616)
  statueLabel.renderOrder = 7
  const statueLabelBase = new THREE.Vector3()
  const statueLabelDock = new THREE.Vector3()
  const statueLabelHomeBottom = new THREE.Vector2()
  let statueLabelFooterHeight = 0
  // 保持可见以参与加载阶段的着色器预编译；桌面端由 opacity=0 隐藏文字。
  // 独立于底座和环境消隐，雕像聚焦时字样仍持续显示。
  scene.add(statueLabel)
  let reflectedStatue: THREE.Object3D | undefined
  const themeTint = createThemeTint('#e23456')
  const {
    color: themeColor,
    origin: themeOrigin,
    targets: tintTargets,
    byColor: tintByColor,
    track: trackTint,
  } = themeTint
  // 深色沿用原始地面基色；浅色仅替换基准明度和饱和度，两者共用主题色缓动。
  const floorLightPalette = new Map(
    (
      [
        ['nearColor', '#f4f1ed'],
        ['farColor', '#e9e1df'],
        ['sheenColor', '#020101'],
      ] as const
    ).map(([name, color]) => [
      floor.material.uniforms[name].value as THREE.Color,
      new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }),
    ])
  )
  const floorColors = [...floorLightPalette.keys()]
  const lightStoneColors = new Set<THREE.Color>([
    plinthMaterial.color,
    ...obelisks.flatMap((item) => [
      item.surface.color,
      item.baseMaterial.color,
    ]),
  ])
  const lightUniformColors = new Map([
    [ambient.color, new THREE.Color('#fff5ee')],
    [key.color, new THREE.Color('#fffaf5')],
  ])
  const white = new THREE.Color('#ffffff')
  const stoneHsl = { h: 0, s: 0, l: 0 }
  const refineTintTarget = (item: ThemeTintEntry) => {
    if (item.color === statueLabelMaterial.color) item.target.copy(themeColor)
    if (!lightMode) return
    if (lightStoneColors.has(item.color)) {
      item.target.getHSL(stoneHsl)
      item.target.setHSL(stoneHsl.h, stoneHsl.s * 0.22, 0.58)
    }
    const fixedColor = lightUniformColors.get(item.color)
    if (fixedColor) item.target.copy(fixedColor)
    if (item.color === rim.color) item.target.lerp(white, 0.5)
  }
  // 只改颜色 uniform，不重建材质、模型、纹理或后处理通道。
  const themeBlend = { value: 1 }
  let themeTintRevision = 0
  let themeTransition: gsap.core.Tween | undefined
  const applyThemeTint = () => {
    themeTintRevision++
    themeTint.apply(themeBlend.value)
    invalidate()
  }
  const setThemeColor = (color: string, animate = true) => {
    themeTransition?.kill()
    themeTint.prepare(
      color,
      lightMode ? floorLightPalette : undefined,
      refineTintTarget
    )
    for (const obelisk of obelisks)
      obelisk.labelInk.value.set(lightMode ? '#29252b' : '#ffffff')
    stage.dataset.themeColor = color
    if (
      !animate ||
      reducedMotion ||
      (simpleEntrance && stage.dataset.entranceFinished !== 'true')
    ) {
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
          paused: hosted || !sceneActive || document.hidden,
          onUpdate: applyThemeTint,
        }
      )
  }
  const staticSceneCache = createStaticSceneCache(
    renderer,
    scene,
    camera,
    invalidate
  )
  let pillarBatches: ReturnType<typeof createPillarBatches> | undefined
  let reflectionBatches: ReturnType<typeof createPillarBatches> | undefined
  let updateEnvironmentQueues: (() => void) | undefined
  let updateSceneMatrices: (() => boolean) | undefined
  const drawScene = (updateComposition = true) => {
    if (updateComposition) {
      if (spotLightPool.update(templeReveal.value > 0))
        staticSceneCache.invalidate()
      updateSceneMatrices?.()
      updateEnvironmentQueues?.()
      pillarBatches?.update()
      reflectionBatches?.update()
    }
    // 相机在构图变化时已更新；渲染器不再重复计算同一帧的相机矩阵。
    camera.matrixWorldAutoUpdate = false
    try {
      staticSceneCache.render()
    } finally {
      camera.matrixWorldAutoUpdate = true
    }
  }
  const environmentHover = { value: 0 }
  const immersionDim = { value: 0 }
  const appearance = {
    themeRevision: -1,
    brightness: NaN,
    statueBrightness: NaN,
    statueHover: NaN,
    sprigatitoHover: NaN,
    sprigatitoFocus: NaN,
  }
  const obeliskAppearance = new Float64Array(obelisks.length * 2).fill(NaN)
  let sprigatitoLightColorsReady = false

  const headRotation = { value: new THREE.Vector4(0, 0, 0, 1) }
  const headPivot = { value: new THREE.Vector3() }
  const headNodPivot = { value: new THREE.Vector3() }
  const headNodAngle = { value: 0 }
  const headacheRedness = { value: headacheMix }
  const headacheHeightRange = { value: new THREE.Vector2(model.cropY, 3.3) }
  const headCurrent = new THREE.Vector2()
  const pointerHeadEase = new THREE.Vector2()
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
  const dizzyEffect = headacheEnabled
    ? createDizzySticker(invalidate)
    : undefined
  const dizzySticker = new THREE.Sprite(
    material(
      new THREE.SpriteMaterial({
        map: dizzyEffect ? texture(dizzyEffect.texture) : null,
        color: LUCARIO_HEADACHE_STICKER_RED,
        opacity: 0,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      })
    )
  )
  dizzySticker.scale.set(1.12, 0.56, 1)
  dizzySticker.renderOrder = 10
  dizzySticker.visible = false
  statue.add(dizzySticker)
  const stickerAnchor = new THREE.Vector3()
  let stickerReveal = 0
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
      flatShading: true,
      clearcoat: 0.45,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
      transparent: false,
      clippingPlanes: [statueClipPlane],
    })
  )
  installHeadRig(chromeMaterial, {
    headRotation,
    headPivot,
    headNodPivot,
    headNodAngle,
  })
  const wireMaterial = material(
    new THREE.MeshBasicMaterial({
      color: HOLY_LIGHT_COLOR,
      wireframe: false,
      transparent: true,
      premultipliedAlpha: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      clippingPlanes: [statueClipPlane],
    })
  )
  // 网格复用模型的静态顶点及头部变形，裁切平面数量固定，切换只更新 uniform 和透明度。
  wireMaterial.onBeforeCompile = chromeMaterial.onBeforeCompile
  // 深度预通道遮住背面线框；黑色 0.55 填充由后续合成表面统一输出。
  const wireDepthMaterial = material(
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      colorWrite: false,
      opacity: 0,
      transparent: true,
      toneMapped: false,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      clippingPlanes: [statueClipPlane],
    })
  )
  wireDepthMaterial.onBeforeCompile = chromeMaterial.onBeforeCompile
  // 只给实体及其镜像增加染色，线框和深度通道保持原有用途。
  installHeadacheTint(chromeMaterial, headacheRedness, headacheHeightRange)
  const statueScan = createModelScan(
    wireMaterial.color,
    config.id === 'mobile' ? 2.28200669 : 4.27876255
  )
  statueScan.install(chromeMaterial, 'chrome')
  statueScan.install(wireMaterial, 'composite')
  for (const value of materials) {
    if ('color' in value && value !== dizzySticker.material)
      trackTint((value as THREE.MeshBasicMaterial).color)
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
  for (const spot of spotLightPool.sources) trackTint(spot.color)
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
        lightTarget:
          color === item.surface.color || color === item.baseMaterial.color
            ? new THREE.Color().setHSL(hsl.h, hsl.s * 0.22, 0.58)
            : undefined,
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

  const installTempleFade = () => {
    const excluded = new Set<THREE.Material>([
      chromeMaterial,
      wireMaterial,
      wireDepthMaterial,
      statueLabelMaterial,
      dizzySticker.material,
      ...zodiacProjections.map((item) => item.material),
    ])
    // 碑身及其倒影只向下收起；圣光单独缩小，其余环境在屏幕中心放大。
    const unexpanded = new Set<THREE.Material>([
      statueHolyLight.material,
      sprigatitoBeamMaterial,
    ])
    for (const shaft of [
      ...obelisks.map((item) => item.shaft),
      ...reflectedShafts,
    ])
      shaft.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.LineSegments ||
          object instanceof THREE.Sprite
        ) {
          const values = Array.isArray(object.material)
            ? object.material
            : [object.material]
          for (const value of values) unexpanded.add(value)
        }
      })
    updateEnvironmentQueues = installEnvironmentFade(
      materials,
      excluded,
      unexpanded,
      templeReveal,
      templeExpansion
    )
  }

  const screenPoint = new THREE.Vector3()
  const islandNodAxis = new THREE.Vector3(1, 0, 0)
  const islandNodQuaternion = new THREE.Quaternion()
  const screenProjection = createScreenProjection()
  const pointerHitSample = { clientX: 0, clientY: 0 }
  // 复用投影缓冲；消费者同步读取坐标，不将这个可变对象作为响应式快照。
  const islandModelAnchors: IslandModelAnchors = {
    chest: { x: 0, y: 0 },
    rightHand: { x: 0, y: 0 },
    leftHand: { x: 0, y: 0 },
    rightBraid: { x: 0, y: 0 },
    leftBraid: { x: 0, y: 0 },
  }
  const projectIslandAnchor = (
    point: { x: number; y: number },
    x: number,
    y: number,
    z: number,
    followsHead = false
  ) => {
    screenPoint.set(x, y, z)
    // 辫子沿用着色器的低头与转头变换，保持端点贴合模型。
    if (followsHead)
      screenPoint
        .sub(headNodPivot.value)
        .applyQuaternion(islandNodQuaternion)
        .add(headNodPivot.value)
        .sub(headPivot.value)
        .applyQuaternion(headQuaternion)
        .add(headPivot.value)
    screenProjection.point(screenPoint)
    point.x = (screenPoint.x * 0.5 + 0.5) * viewWidth
    point.y = (0.5 - screenPoint.y * 0.5) * viewHeight
  }
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
  const compareProjectedPoints = (
    a: (typeof projectedPoints)[number],
    b: (typeof projectedPoints)[number]
  ) => a.x - b.x || a.y - b.y
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
      screenProjection.object(item.shaft.matrixWorld)
      for (let index = 0; index < hitPoints.length; index++) {
        const [x, y, z] = hitPoints[index]
        screenProjection.point(screenPoint.set(x, y, z))
        const point = projectedPoints[index]
        point.x = (screenPoint.x * 0.5 + 0.5) * viewWidth
        point.y = (-screenPoint.y * 0.5 + 0.5) * viewHeight
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
      sortedPoints.sort(compareProjectedPoints)
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
      let polygon = ''
      for (let index = 0; index < projectionHull.length; index++) {
        const point = projectionHull[index]
        if (index) polygon += ','
        polygon += `${(((point.x - minX) / width) * 100).toFixed(3)}% ${(
          ((point.y - minY) / height) *
          100
        ).toFixed(3)}%`
      }
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
    !hosted &&
    !sceneOccluded &&
    (sceneActive || entranceActive) &&
    !document.hidden
  const canRender = () =>
    ready && !hosted && isSceneActive() && !disposed && stage.isConnected
  const render = (now: number) => {
    frame = undefined
    if (!canRender()) return
    if (dizzyFrameTimer !== undefined) {
      clearTimeout(dizzyFrameTimer)
      dizzyFrameTimer = undefined
    }
    if (now - lastDraw < 1000 / 60 - 0.1) {
      scheduleFrame()
      return
    }
    // 指数阻尼按真实经过时间推进；低帧率时不能把每帧裁成 100ms，否则变暗/回正会被拖长数倍。
    const elapsed = motionIdle ? 1 / 60 : Math.min((now - lastDraw) / 1000, 1)
    motionIdle = false
    lastDraw = now
    const flowOnlyFrame = !frameContentDirty
    frameContentDirty = false
    if (
      flowOnlyFrame &&
      selected === 'statue' &&
      statueScan.progress.value === 1 &&
      !reducedMotion &&
      !projectionDirty &&
      !transitionActive &&
      !cameraMoving &&
      !statueRestorePending &&
      !immersive &&
      !themeTransition?.isActive() &&
      !petEntrance?.isActive() &&
      (!diagnosticsEnabled ||
        (!diagnosticsDirty && now - lastDiagnosticAt < DIAGNOSTIC_INTERVAL))
    ) {
      // 稳态光电只改变时间 uniform；姿态、灯光、矩阵和锚点沿用上次结果。
      // 指针、主题、尺寸及路由变化仍由 invalidate 唤醒完整更新。
      statueScan.advanceFlow(elapsed)
      drawScene(false)
      scheduleFrame()
      return
    }
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
    // 同帧的缩放、视角与偏移补间结束后只重建一次投影，所有锚点读取最终矩阵。
    if (viewOffsetDirty) applyViewOffset()
    // 角度动画仍需绘制，但仅构图变化才更新投影、倒影位置和命中区域。
    const sceneChanged = projectionDirty
    const canFollowPet =
      selected === 'sprigatito' &&
      !transitionActive &&
      !cameraMoving &&
      !petEntrance?.isActive() &&
      sprigatitoPose.value === 1
    if (!canFollowPet) petHeadTarget.set(0, 0)
    const headBlend = reducedMotion ? 1 : 1 - Math.exp(-elapsed * 8)
    petHead.lerp(petHeadTarget, headBlend)
    const petHeadMoving = petHead.distanceToSquared(petHeadTarget) > 0.000001
    if (!petHeadMoving) petHead.copy(petHeadTarget)
    for (const mesh of petMeshes) {
      if (!mesh?.morphTargetInfluences) continue
      mesh.morphTargetInfluences[0] = sprigatitoPose.value
      mesh.morphTargetInfluences[1] = petHead.x
      mesh.morphTargetInfluences[2] = petHead.y
    }
    // 聚焦与返回共用同一个进度；实体、简化网格及倒影同步切换，手势继续使用原姿态。
    const sprigatitoWireMix = isTempleWireframeModel('sprigatito')
      ? 1
      : sprigatitoFocus.value
    if (sprigatitoSurface)
      sprigatitoSurface.opacity = (1 - sprigatitoWireMix) * petVisibility.value
    if (sprigatitoMesh) sprigatitoMesh.visible = sprigatitoWireMix < 1
    if (sprigatitoWire) {
      sprigatitoWire.visible = sprigatitoWireMix > 0
      sprigatitoWire.material.opacity = sprigatitoWireMix * petVisibility.value
    }
    if (sprigatitoWireDepth)
      sprigatitoWireDepth.visible =
        sprigatitoWireMix > 0 && petVisibility.value > 0
    if (reflectedSprigatitoSurface) {
      reflectedSprigatitoSurface.visible = sprigatitoWireMix < 1
      reflectedSprigatitoSurface.material.opacity =
        petReflectionOpacity * (1 - sprigatitoWireMix) * petVisibility.value
    }
    if (reflectedSprigatitoWire) {
      reflectedSprigatitoWire.visible = sprigatitoWireMix > 0
      reflectedSprigatitoWire.material.opacity =
        petReflectionOpacity * sprigatitoWireMix * petVisibility.value
    }
    if (reflectedSprigatitoWireDepth)
      reflectedSprigatitoWireDepth.visible =
        sprigatitoWireMix > 0 && petVisibility.value > 0
    const statueOnly = selected === 'statue'
    const environmentVisible = templeReveal.value > 0
    templeExpansion.value =
      1 + (1 - templeReveal.value) * STATUE_ENVIRONMENT_EXPANSION
    monuments.visible = environmentVisible
    ground.visible = environmentVisible
    reflection.visible = environmentVisible
    pedestal.visible = environmentVisible && sprigatitoFocus.value < 1
    reflectedPedestal.visible = pedestal.visible
    sleepingSprigatito.visible = environmentVisible
    statueGlow.visible = environmentVisible
    // 构图与材质使用独立进度：运镜末段开始扫描，返回首页先完成材质恢复。
    chromeMaterial.depthTest = true
    chromeMaterial.opacity = 1
    chromeMaterial.forceSinglePass = true
    const scanProgress = statueScan.progress.value
    const scanning = scanProgress > 0 && scanProgress < 1
    // 返回时选中状态先清除，光点需随剩余网格持续到材质恢复结束。
    statueScan.flowEnabled.value = scanProgress > 0 ? 1 : 0
    const wireFlowActive = scanProgress > 0 && !reducedMotion
    // 仅可见网格推进共享时钟；后台恢复沿用暂停位置，不补算隐藏期间的时间。
    if (wireFlowActive) statueScan.advanceFlow(elapsed)
    wireMaterial.opacity = scanProgress > 0 ? 1 : 0
    wireDepthMaterial.opacity = scanProgress > 0 ? 0.55 : 0
    if (statueMesh) {
      statueMesh.visible = scanProgress < 1
      statueMesh.renderOrder = statueOnly ? 4 : 0
    }
    if (statueWire) statueWire.visible = scanProgress > 0
    if (statueWireDepth) statueWireDepth.visible = scanProgress > 0
    // 扫描亮边由合成表面输出，无独立扩张表面。
    const statueMouseFollow =
      statueOnly && !cameraMoving && scanProgress === 1 && !statueRestorePending
    const followHead =
      !entranceActive && !returningStatue && (!statueOnly || statueMouseFollow)
    const headacheActive = headacheEnabled && selected !== 'statue'
    const aimAtObelisk = !!focusedObelisk
    if (focusedObelisk && aimAtObelisk && rig.enabled) {
      // 聚焦镜头下收小水平转角，避免沿用完整几何夹角时头部过度侧转。
      const yaw =
        THREE.MathUtils.clamp(
          Math.atan2(
            focusedObelisk.group.position.x - statue.position.x,
            focusedObelisk.group.position.z - statue.position.z
          ),
          -THREE.MathUtils.degToRad(rig.focusYawLimit),
          THREE.MathUtils.degToRad(rig.focusYawLimit)
        ) * rig.focusYawScale
      // 聚焦时比原低头姿态抬高 10°，与转头共用插值，并抵消头疼姿态的后仰。
      const focusPitch =
        headNodDegrees - 10 + (headacheActive ? headache?.headLeanBack ?? 0 : 0)
      headTarget.set(
        yaw / Math.max((rig.pointerYaw * Math.PI) / 180, 0.001),
        (focusPitch - rig.restPitch) / Math.max(rig.pointerPitch, 0.001)
      )
    }
    if (simpleEntrance && entranceActive && aimAtObelisk)
      headCurrent.copy(headTarget)
    const headDamping = aimAtObelisk
      ? 4
      : rig.pointerDamping * (hasPointer ? 1 : 0.25)
    const followingPointer =
      followHead && !aimAtObelisk && headFocusMotion.progress === 1
    const pointerInputMoving =
      followingPointer &&
      pointerHeadEase.distanceToSquared(headTarget) > 0.000001
    // 参考 yutaabe.com：鼠标目标先以 0.025 / 120Hz 缓动，再驱动姿态层。
    // 聚焦、入场及返回交给原有动画，持续同步起点，避免恢复跟随时跳转。
    if (followingPointer) {
      if (reducedMotion || !pointerInputMoving) pointerHeadEase.copy(headTarget)
      else
        pointerHeadEase.lerp(headTarget, 1 - Math.pow(1 - 0.025, elapsed * 120))
    } else pointerHeadEase.copy(headCurrent)
    if (followHead) {
      if (reducedMotion) headCurrent.copy(headTarget)
      else if (headFocusMotion.progress < 1)
        headCurrent.lerpVectors(
          headFocusStart,
          headTarget,
          headFocusMotion.progress
        )
      else if (pointerInputMoving || !headCurrent.equals(headTarget))
        headCurrent.lerp(
          followingPointer ? pointerHeadEase : headTarget,
          1 - Math.exp(-elapsed * headDamping)
        )
    }
    // 两级均收敛才停绘；单独固定头部终点，避免其他动画使其反复插值。
    const headFollowMoving =
      followHead &&
      (pointerInputMoving ||
        headCurrent.distanceToSquared(headTarget) > 0.000001)
    if (!headFollowMoving && followHead) headCurrent.copy(headTarget)
    let moving = petHeadMoving || headFollowMoving
    if (statueMouseFollow) {
      const yaw = THREE.MathUtils.degToRad(pointerHeadEase.x * rig.bodyYaw)
      const bodyDistance = Math.abs(statue.rotation.y - yaw)
      statue.rotation.y =
        reducedMotion || bodyDistance <= 0.00001
          ? yaw
          : THREE.MathUtils.damp(
              statue.rotation.y,
              yaw,
              rig.pointerDamping,
              elapsed
            )
      statue.rotation.z = 0
      moving ||= Math.abs(statue.rotation.y - yaw) > 0.00001
    }
    // 仅中央模型的全身预览恢复正常；二级模块保留头疼姿态。
    const headacheTarget = headacheActive ? 1 : 0
    headacheMix = reducedMotion
      ? headacheTarget
      : THREE.MathUtils.damp(headacheMix, headacheTarget, 8, elapsed)
    if (Math.abs(headacheMix - headacheTarget) < 0.001)
      headacheMix = headacheTarget
    moving ||= headacheMix !== headacheTarget
    headacheRedness.value = headacheMix
    if (statueMesh?.morphTargetInfluences)
      statueMesh.morphTargetInfluences[0] = headacheMix
    const stickerTarget = headacheEnabled && !selected ? 1 : 0
    stickerReveal = reducedMotion
      ? stickerTarget
      : THREE.MathUtils.damp(stickerReveal, stickerTarget, 10, elapsed)
    if (Math.abs(stickerReveal - stickerTarget) < 0.001)
      stickerReveal = stickerTarget
    moving ||= stickerReveal !== stickerTarget
    // 保留绘制到淡出结束，避免切换模块时先 hidden 导致退场动画消失。
    dizzySticker.visible = stickerReveal > 0
    dizzySticker.material.opacity = stickerReveal
    if (dizzySticker.visible && dizzySticker.material.map) {
      const stickerFrame = reducedMotion
        ? 0
        : Math.floor(now / DIZZY_STICKER_FRAME_MS)
      dizzyEffect?.update(stickerFrame)
    }
    const pitch = THREE.MathUtils.degToRad(
      rig.enabled
        ? rig.restPitch -
            (headache?.headLeanBack ?? 0) * headacheMix +
            headCurrent.y * rig.pointerPitch
        : 0
    )
    const yaw = THREE.MathUtils.degToRad(
      rig.enabled ? headCurrent.x * rig.pointerYaw : 0
    )
    const roll = THREE.MathUtils.degToRad(
      (headache?.headTilt ?? 0) * headacheMix
    )
    if (
      headAngles.x !== pitch ||
      headAngles.y !== yaw ||
      headAngles.z !== roll
    ) {
      headAngles.set(pitch, yaw, roll)
      headQuaternion.setFromEuler(headAngles)
      headRotation.value.set(
        headQuaternion.x,
        headQuaternion.y,
        headQuaternion.z,
        headQuaternion.w
      )
    }
    headNodAngle.value = THREE.MathUtils.degToRad(entranceHeadDip.value)
    if (statueMesh) {
      stickerAnchor.copy(headNodPivot.value)
      stickerAnchor.y += 0.5
      stickerAnchor.z += 0.12
      stickerAnchor
        .sub(headPivot.value)
        .applyQuaternion(headQuaternion)
        .add(headPivot.value)
      dizzySticker.position.copy(stickerAnchor).add(statueMesh.position)
    }
    if (sceneChanged) {
      camera.lookAt(lookAt)
      camera.updateMatrixWorld()
      ground.rotation.y = Math.atan2(
        camera.position.x - lookAt.x,
        camera.position.z - lookAt.z
      )
      // 模型、底座、地面光与倒影共用同一纵深，运镜期间同步更新，避免倒影脱离实体。
      pedestal.position.z = statue.position.z
      reflectedSprigatito?.position.copy(sleepingSprigatito.position)
      reflectedSprigatito?.rotation.copy(sleepingSprigatito.rotation)
      // 沿镜头右方向偏移，仅在聚焦结束时达到宠物配置的完整偏移量。
      const lightOffset =
        currentPet.topLight.focusRightOffset * sprigatitoFocus.value
      const lightYaw = ground.rotation.y
      sprigatitoBeam.scale.x = sprigatitoBeam.scale.z =
        0.55 * currentPet.topLight.widthScale
      sprigatitoBeam.position.x =
        sleepingSprigatito.position.x + Math.cos(lightYaw) * lightOffset
      sprigatitoBeam.position.z =
        sleepingSprigatito.position.z - Math.sin(lightYaw) * lightOffset
      sprigatitoPool.position.x = sleepingSprigatito.position.x
      sprigatitoPool.position.z = sleepingSprigatito.position.z
      sprigatitoSpot.position.x = sprigatitoBeam.position.x
      sprigatitoSpot.position.z = sprigatitoBeam.position.z + 0.5
      sprigatitoSpot.target.position.copy(sleepingSprigatito.position)
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
    }
    // 运镜结束后再检测静止指针，避免过渡期间每帧进行布局命中查询和射线拾取。
    if (hasPointer && sceneChanged && !cameraMoving) {
      // 静止指针重判只在运镜结束/缩放时需要最新命中矩阵，正常运镜仅渲染前更新一次。
      updateSceneMatrices?.()
      const target = document.elementFromPoint(lastPointer.x, lastPointer.y)
      pointerHitSample.clientX = lastPointer.x
      pointerHitSample.clientY = lastPointer.y
      const hit = isSceneTarget(target)
        ? raycast(pointerHitSample, true, true)
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
    syncStatueLabelTarget(now)
    if (reducedMotion) statueLabelReveal.value = statueLabelTarget
    else {
      const distance = statueLabelTarget - statueLabelMotionStart
      const travel = Math.max(
        0,
        (now - statueLabelMotionTime) / 1000 / STATUE_LABEL_HOVER_DURATION
      )
      statueLabelReveal.value =
        statueLabelMotionStart +
        Math.sign(distance) * Math.min(Math.abs(distance), travel)
    }
    if (statueLabelReveal.value !== statueLabelTarget) hoverMoving = true
    statueLabelMaterial.opacity = 1
    statueLabelFocus.value = statueView.mix
    statueLabel.scale.setScalar(1 + statueView.mix * 0.5)
    // 屏幕下沿从点击时的位置直接插值到目标，再反投影；镜头移动不会令文字越过终点。
    statueLabelBase.set(
      0,
      0.52 + statueLabelHalfHeight,
      statue.position.z + 1.616
    )
    if (statueOnly || statueView.mix > 0) {
      statueLabelDock.copy(statueLabelBase).project(camera)
      statueLabelDock
        .set(
          THREE.MathUtils.lerp(statueLabelHomeBottom.x, 0, statueView.mix),
          THREE.MathUtils.lerp(
            statueLabelHomeBottom.y,
            ((statueLabelFooterHeight * 3 + STATUE_LABEL_DOCK_OFFSET) * 2) /
              viewHeight -
              1,
            statueView.mix
          ),
          statueLabelDock.z
        )
        .unproject(camera)
      statueLabelDock.y += statueLabelHalfHeight * statueLabel.scale.y
      statueLabel.position.copy(statueLabelDock)
    } else statueLabel.position.copy(statueLabelBase)
    statueLabelMaterial.depthTest = !(statueOnly || returningStatue)
    statueLabel.visible = statueLabelReveal.value > 0
    labelLod?.measure(
      camera,
      statueLabelHalfHeight,
      statueLabelDepth,
      viewHeight,
      !entranceActive &&
        !transitionActive &&
        !cameraMoving &&
        statueLabelReveal.value === statueLabelTarget &&
        !returningStatue
    )
    const holyScale = 0.08 + templeReveal.value * 0.92
    const holyHighlight = immersive ? 1 : statueHover.value
    statueHolyLight.scale.set(
      (1 + holyHighlight * 0.3) * holyScale,
      (1 + holyHighlight * 0.08) * holyScale,
      1
    )
    const environmentHoverTarget =
      hovered ||
      statueHoverTarget ||
      focusedObelisk ||
      selected === 'sprigatito'
        ? 1
        : 0
    environmentHover.value = THREE.MathUtils.damp(
      environmentHover.value,
      environmentHoverTarget,
      4,
      elapsed
    )
    if (Math.abs(environmentHover.value - environmentHoverTarget) > 0.001)
      hoverMoving = true
    else environmentHover.value = environmentHoverTarget
    const immersionDimTarget = immersive ? 1 : 0
    immersionDim.value = THREE.MathUtils.damp(
      immersionDim.value,
      immersionDimTarget,
      4,
      elapsed
    )
    if (Math.abs(immersionDim.value - immersionDimTarget) > 0.001)
      hoverMoving = true
    else immersionDim.value = immersionDimTarget
    // 禅模式只压暗周围场景，路卡仍沿用常态材质和补光。
    const environmentDim = Math.max(environmentHover.value, immersionDim.value)
    const environmentBrightness = 1 - environmentDim * (lightMode ? 0.18 : 0.58)
    const environmentAppearanceChanged =
      appearance.brightness !== environmentBrightness ||
      appearance.themeRevision !== themeTintRevision
    let reflectionAppearanceChanged = environmentAppearanceChanged
    // 每帧从主题缓动的基色恢复，再叠加悬停；退出 hover 不会留下颜色或亮度残值。
    if (environmentAppearanceChanged) {
      for (const entry of tintTargets) {
        entry.color.copy(entry.current)
        // 常态字样保持当前主题色，不参与聚焦时的背景压暗。
        if (
          entry.color !== statueLabelMaterial.color &&
          !(lightMode && floorLightPalette.has(entry.color))
        )
          entry.color.multiplyScalar(environmentBrightness)
      }
      ambient.intensity = (lightMode ? 1.5 : 0.65) * environmentBrightness
      key.intensity = (lightMode ? 2.3 : 1.6) * environmentBrightness
      rim.intensity = (lightMode ? 1.4 : 2.8) * environmentBrightness
    }
    const statueBrightness =
      1 -
      Math.max(0, environmentHover.value - statueHover.value) *
        (lightMode ? 0.18 : 0.58)
    if (
      environmentAppearanceChanged ||
      appearance.statueBrightness !== statueBrightness ||
      appearance.statueHover !== statueHover.value
    ) {
      // 路卡悬停时保留自身材质和补光亮度，其他模型沿用环境压暗。
      chromeMaterial.color
        .copy(tintByColor.get(chromeMaterial.color)!.current)
        .multiplyScalar(statueBrightness * (1 + statueHover.value * 0.3))
      statueLight.intensity =
        (lightMode ? 16 : 42) * statueBrightness * (1 + statueHover.value * 0.5)
      chromeMaterial.envMapIntensity =
        (1.8 + statueHover.value * 0.8) * statueBrightness
      chromeMaterial.clearcoat = 0.45 + statueHover.value * 0.25
      reflectionAppearanceChanged = true
    }
    const sprigatitoHoverTarget =
      hovered === 'sprigatito' || selected === 'sprigatito' ? 1 : 0
    sprigatitoHover.value = THREE.MathUtils.damp(
      sprigatitoHover.value,
      sprigatitoHoverTarget,
      4,
      elapsed
    )
    if (Math.abs(sprigatitoHover.value - sprigatitoHoverTarget) > 0.001)
      hoverMoving = true
    else sprigatitoHover.value = sprigatitoHoverTarget
    if (
      sprigatitoSurface &&
      (environmentAppearanceChanged ||
        appearance.sprigatitoHover !== sprigatitoHover.value)
    ) {
      const surface = sprigatitoSurface
      const tint = tintByColor.get(surface.color)!
      surface.color
        .copy(tint.current)
        .lerp(sprigatitoHoverColor, sprigatitoHover.value)
        .multiplyScalar(
          (1 - (environmentDim - sprigatitoHover.value) * 0.58) *
            (lightMode ? 0.55 : 1)
        )
      surface.envMapIntensity = 2.5 + sprigatitoHover.value * 0.8
      // 给宠物暗面补足基础亮度，颜色跟随主题和悬停状态，避免纯金属背光时近乎全黑。
      surface.emissive.copy(surface.color)
      surface.emissiveIntensity = 0.08
      surface.clearcoat = 0.45 + sprigatitoHover.value * 0.25
      reflectionAppearanceChanged = true
    }
    const initialSprigatitoHover =
      (!selected || selected === 'sprigatito') && !entranceActive
        ? sprigatitoHover.value
        : 0
    const sprigatitoIllumination =
      Math.max(sprigatitoFocus.value, initialSprigatitoHover) * 0.5
    // 从完整亮度开始，以余弦曲线平滑呼吸；复用场景时钟，不另建计时器。
    const immersiveHolyLight =
      immersive && !reducedMotion
        ? 0.15 +
          0.85 *
            (0.5 +
              0.5 *
                Math.cos(
                  ((now - immersionStartedAt) /
                    IMMERSIVE_HOLY_LIGHT_PERIOD_MS) *
                    Math.PI *
                    2
                ))
        : 1
    statueHolyLight.material.uniforms.intensity.value =
      statueHolyIntensity.value *
      (1 + holyHighlight * 0.6) *
      (1 - sprigatitoHover.value) *
      immersiveHolyLight
    statueHolyLight.visible =
      environmentVisible &&
      statueHolyLight.material.uniforms.intensity.value > 0
    const backgroundBaseReveal = 1 - sprigatitoFocus.value
    if (appearance.sprigatitoFocus !== sprigatitoFocus.value) {
      for (const entry of fadingBaseMaterials)
        entry.value.opacity = entry.opacity * backgroundBaseReveal
    }
    sprigatitoBeamMaterial.uniforms.intensity.value = sprigatitoIllumination
    sprigatitoPoolMaterial.opacity = sprigatitoIllumination * 0.8
    sprigatitoBeam.visible = environmentVisible && sprigatitoIllumination > 0
    sprigatitoPool.visible = sprigatitoBeam.visible
    sprigatitoSpot.intensity = sprigatitoIllumination * 55
    if (!sprigatitoLightColorsReady || environmentAppearanceChanged) {
      for (const color of sprigatitoLightColors) color.copy(sprigatitoTheme)
      sprigatitoLightColorsReady = true
    }
    for (const [index, item] of obelisks.entries()) {
      const projection = zodiacProjections[index]
      const projectionChanged = projection.update(
        hovered === item.category.id && !selected && !transitionActive,
        elapsed
      )
      if (projection.moving) hoverMoving = true
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
      const hoverIndex = index * 2
      if (
        !environmentAppearanceChanged &&
        !projectionChanged &&
        obeliskAppearance[hoverIndex] === item.hoverStrength &&
        obeliskAppearance[hoverIndex + 1] === item.strength
      )
        continue
      obeliskAppearance[hoverIndex] = item.hoverStrength
      obeliskAppearance[hoverIndex + 1] = item.strength
      reflectionAppearanceChanged = true
      const brightness =
        1 - (environmentDim - item.hoverStrength) * (lightMode ? 0.18 : 0.58)
      for (const entry of obeliskTints[index])
        entry.base.color
          .copy(entry.base.current)
          .lerp(
            lightMode && entry.lightTarget ? entry.lightTarget : entry.target,
            item.hoverStrength
          )
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
    }
    if (reflectionAppearanceChanged) {
      for (const { source, copy, character } of reflectionMaterials) {
        copy.color.copy(source.color)
        if (copy instanceof THREE.MeshStandardMaterial) {
          // 角色倒影压低环境高光并放宽高光瓣，底座沿用石材明暗，避免白色剪影与无层次暗块。
          copy.metalness = source.metalness
          copy.roughness = character
            ? Math.max(0.22, source.roughness)
            : source.roughness
          copy.envMapIntensity = source.envMapIntensity * (character ? 0.45 : 1)
          copy.emissive.copy(source.emissive)
          copy.emissiveIntensity =
            source.emissiveIntensity * (character ? 0.5 : 1)
        } else {
          copy.color.r += source.emissive.r * source.emissiveIntensity
          copy.color.g += source.emissive.g * source.emissiveIntensity
          copy.color.b += source.emissive.b * source.emissiveIntensity
        }
      }
      for (const entry of reflectionColors) entry.copy.copy(entry.source)
    }
    appearance.themeRevision = themeTintRevision
    appearance.brightness = environmentBrightness
    appearance.statueBrightness = statueBrightness
    appearance.statueHover = statueHover.value
    appearance.sprigatitoHover = sprigatitoHover.value
    appearance.sprigatitoFocus = sprigatitoFocus.value
    // 开关包住整个计算分支，关闭时不执行格式化、额外投影和 DOM 发布。
    // 入场、主题、点击投影等产品状态在此分支之外维护。
    const publishDiagnostics =
      diagnosticsEnabled &&
      (diagnosticsDirty ||
        now - lastDiagnosticAt >= DIAGNOSTIC_INTERVAL ||
        !(moving || transitionActive || hoverMoving || wireFlowActive))
    if (publishDiagnostics) {
      lastDiagnosticAt = now
      diagnosticsDirty = false
      setStageData('headacheRedness', headacheRedness.value.toFixed(3))
      setStageData('headacheStickerOpacity', stickerReveal.toFixed(3))
      setStageData(
        'headacheStickerColor',
        `#${dizzySticker.material.color.getHexString()}`
      )
      setStageData('headacheMode', headacheMix === 0 ? 'normal' : 'headache')
      setStageData('headacheMix', headacheMix.toFixed(3))
      setStageData('headacheSticker', String(dizzySticker.visible))
      if (dizzySticker.visible && dizzySticker.material.map)
        setStageData(
          'headacheStickerFrame',
          String(reducedMotion ? 0 : Math.floor(now / DIZZY_STICKER_FRAME_MS))
        )
      setStageData('templeReveal', templeReveal.value.toFixed(3))
      setStageData('templeScale', templeExpansion.value.toFixed(3))
      setStageData('statueHolyScale', statueHolyLight.scale.x.toFixed(3))
      setStageData('statueLabelReveal', statueLabelReveal.value.toFixed(3))
      setStageData(
        'statueLabelLetters',
        [...STATUE_LABEL_TEXT]
          .map((_, index) =>
            THREE.MathUtils.clamp(
              (statueLabelReveal.value * STATUE_LABEL_HOVER_DURATION -
                index * STATUE_LABEL_STAGGER) /
                STATUE_LABEL_CHARACTER_DURATION,
              0,
              1
            ).toFixed(3)
          )
          .join(',')
      )
      setStageData('statueLabelVisible', String(statueLabel.visible))
      setStageData('statueLabelScale', statueLabel.scale.x.toFixed(3))
      setStageData(
        'statueLabelColor',
        `#${statueLabelMaterial.color.getHexString()}`
      )
      setStageData('statueLabelScanlines', statueLabelFocus.value.toFixed(3))
      setStageData('statueLabelDepth', statueLabelDepth.toFixed(3))
      screenPoint.copy(statueLabel.position)
      screenPoint.y -= statueLabelHalfHeight * statueLabel.scale.y
      screenPoint.project(camera)
      setStageData(
        'statueLabelBottom',
        ((0.5 - screenPoint.y * 0.5) * viewHeight).toFixed(2)
      )
      setStageData('statueDepthTest', String(chromeMaterial.depthTest))
      setStageData('statueSheen', chromeMaterial.envMapIntensity.toFixed(3))
      setStageData('statueColor', `#${chromeMaterial.color.getHexString()}`)
      setStageData(
        'floorColors',
        floorColors.map((color) => `#${color.getHexString()}`).join(',')
      )
      setStageData(
        'statueBodyRotation',
        statue.rotation.toArray().slice(0, 3).join(',')
      )
      setStageData('statueZ', String(statue.position.z))
      setStageData('statueY', statue.position.y.toFixed(4))
      setStageData('statueFullY', statueFullY.toFixed(4))
      setStageData(
        'materialPhase',
        scanProgress === 1 ? 'wireframe' : scanning ? 'scanning' : 'chrome'
      )
      setStageData('statueWireOpacity', wireMaterial.opacity.toFixed(3))
      // 活动进度保留真实精度，避免刚开始扫描时被四舍五入成 0、与运镜状态矛盾。
      setStageData(
        'statueScanProgress',
        scanning ? String(scanProgress) : scanProgress.toFixed(4)
      )
      setStageData(
        'statueRestoring',
        String(statueRestorePending || returningStatue)
      )
      setStageData(
        'statueReturnPhase',
        statueRestorePending
          ? 'aligning'
          : returningStatue
          ? 'scanning'
          : 'none'
      )
      setStageData('statueMouseFollow', String(statueMouseFollow))
      setStageData(
        'statueHeadPointer',
        headCurrent
          .toArray()
          .map((value) => value.toFixed(5))
          .join(',')
      )
      setStageData('cameraMoving', String(cameraMoving))
      setStageData('statueChromeOpacity', chromeMaterial.opacity.toFixed(3))
      setStageData('statueScanGlow', String(scanning))
      setStageData('statueWireFlow', String(wireFlowActive))
      setStageData('statueFillOpacity', wireDepthMaterial.opacity.toFixed(3))
      setStageData(
        'statueFillColor',
        `#${wireDepthMaterial.color.getHexString()}`
      )
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
      setStageData(
        'zodiacProjection',
        zodiacProjections.map((item) => item.strength.toFixed(3)).join(',')
      )
      setStageData('companionFocus', sprigatitoFocus.value.toFixed(3))
      setStageData(
        'companionMaterialPhase',
        sprigatitoWireMix === 1 ? 'wireframe' : 'chrome'
      )
      setStageData('companionWireOpacity', sprigatitoWireMix.toFixed(3))
      setStageData('companionHeadPose', sprigatitoPose.value.toFixed(3))
      setStageData(
        'companionHeadFollow',
        `${petHead.x.toFixed(3)},${petHead.y.toFixed(3)}`
      )
      setStageData('companionVisibility', petVisibility.value.toFixed(3))
      setStageData(
        'companionPose',
        currentPet.model === 'sprigatito' && sprigatitoPose.value === 0
          ? 'sleep'
          : currentPet.pose
      )
      setStageData('backgroundBaseReveal', backgroundBaseReveal.toFixed(3))
      setStageData(
        'backgroundBaseDepthWrite',
        fadingBaseMaterials
          .map(({ value }) => Number(value.depthWrite))
          .join(',')
      )
      setStageData(
        'companionRotation',
        THREE.MathUtils.radToDeg(sleepingSprigatito.rotation.y).toFixed(2)
      )
      setStageData('companionHolyLight', sprigatitoIllumination.toFixed(3))
      setStageData(
        'companionLightColor',
        `#${sprigatitoSpot.color.getHexString()}`
      )
      if (sprigatitoMesh) {
        screenPoint
          .copy(sleepingSprigatito.position)
          .add(new THREE.Vector3(0, sprigatitoSize.y / 2, 0))
        if (selected === 'sprigatito' && !transitionActive && !cameraMoving)
          screenPoint.copy(lookAt)
        screenPoint.project(camera)
        setStageData(
          'companionScreen',
          `${(((screenPoint.x + 1) * viewWidth) / 2).toFixed(2)},${(
            ((1 - screenPoint.y) * viewHeight) /
            2
          ).toFixed(2)}`
        )
      }
      if (
        sprigatitoMesh &&
        selected === 'sprigatito' &&
        !transitionActive &&
        !cameraMoving &&
        sprigatitoPose.value === 1 &&
        !petEntrance?.isActive()
      ) {
        // 仅在静止末帧发布真实投影尺寸，验证镜头适配；不产生常驻渲染或逐帧骨骼计算。
        const { minX, maxX, minY, maxY } = petScreenBounds(
          sprigatitoMesh,
          camera
        )
        const facing =
          floraReferenceModel && currentPet.model !== 'sprigatito'
            ? currentPetAssetFacing
            : undefined
        if (facing) {
          const direction = new THREE.Vector3()
            .fromArray(facing)
            .applyQuaternion(sleepingSprigatito.quaternion)
          direction.y = 0
          const towardCamera = camera.position.clone().sub(lookAt)
          towardCamera.y = 0
          setStageData(
            'companionFacingDot',
            direction.normalize().dot(towardCamera.normalize()).toFixed(4)
          )
        }
        setStageData(
          'companionScreenBounds',
          [
            ((minX + 1) * viewWidth) / 2,
            ((1 - maxY) * viewHeight) / 2,
            ((maxX - minX) * viewWidth) / 2,
            ((maxY - minY) * viewHeight) / 2,
          ]
            .map((value) => value.toFixed(2))
            .join(',')
        )
      }
      setStageData('environmentBrightness', environmentBrightness.toFixed(3))
      setStageData(
        'headAim',
        (aimAtObelisk ? focusedObelisk?.category.id : undefined) ||
          (returningPillar ? 'center' : 'pointer')
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
    const cacheAllowed =
      // 聚焦时光幕/倒影与角色交错，单张环境缓存无法保留透明层顺序。
      !selected &&
      !entranceActive &&
      !transitionActive &&
      !cameraMoving &&
      !themeTransition?.isActive() &&
      !hoverMoving &&
      !sceneChanged &&
      templeReveal.value === 1 &&
      !petEntrance?.isActive() &&
      !petFadingOut
    staticSceneCache.setEnabled(cacheAllowed)
    if (sceneChanged || reflectionAppearanceChanged || transitionActive)
      staticSceneCache.invalidate()
    drawScene()
    if (publishDiagnostics) {
      setStageData('activeSpotLights', String(spotLightPool.activeCount))
      setStageData('staticCacheBuilds', String(staticSceneCache.builds))
      setStageData('staticCacheHits', String(staticSceneCache.hits))
      setStageData('sceneDrawCalls', String(renderer.info.render.calls))
    }
    if (sceneChanged || (selected === 'statue' && callbacks.islandAnchors))
      screenProjection.camera(camera)
    if (selected === 'statue' && statueMesh && callbacks.islandAnchors) {
      screenProjection.object(statueMesh.matrixWorld)
      islandNodQuaternion.setFromAxisAngle(islandNodAxis, headNodAngle.value)
      // 锚点取自当前路卡网格的胸刺、双手与双辫，随模型世界矩阵与镜头一起投影。
      projectIslandAnchor(islandModelAnchors.chest, 0, 2.04385, 0.34162)
      projectIslandAnchor(islandModelAnchors.rightHand, -0.568, 1.059, 0.185)
      projectIslandAnchor(islandModelAnchors.leftHand, 0.568, 1.059, 0.185)
      projectIslandAnchor(
        islandModelAnchors.rightBraid,
        -0.37229,
        2.27173 + neckExtension,
        -0.19638,
        true
      )
      projectIslandAnchor(
        islandModelAnchors.leftBraid,
        0.37229,
        2.27173 + neckExtension,
        -0.19638,
        true
      )
      callbacks.islandAnchors(islandModelAnchors)
    }
    if (publishDiagnostics) {
      setStageData('renderFrames', String(renderer.info.render.frame))
      setStageData('gpuGeometries', String(renderer.info.memory.geometries))
    }
    // 头部跟随和晶体悬停不会改变柱子轮廓，只有镜头、建筑移动或窗口缩放时更新点击区域。
    if (sceneChanged) {
      projectButtons()
      // 时钟锚定模型底部的真实投影，随运镜和尺寸变化更新；复用场景渲染循环。
      if (!selected || selected === 'statue') {
        screenPoint
          .set(
            0,
            Math.min(0, -statueClipPlane.constant),
            statue.position.z + 1.2
          )
          .project(camera)
        const x = `${((screenPoint.x * 0.5 + 0.5) * viewWidth).toFixed(2)}px`
        const y = `${((0.5 - screenPoint.y * 0.5) * viewHeight).toFixed(2)}px`
        if (stage.style.getPropertyValue('--temple-clock-x') !== x)
          stage.style.setProperty('--temple-clock-x', x)
        if (stage.style.getPropertyValue('--temple-clock-y') !== y)
          stage.style.setProperty('--temple-clock-y', y)
      }
      screenPoint
        .set(0, templeCamera.horizonY, horizonZ)
        .applyMatrix4(ground.matrixWorld)
        .project(camera)
      // 标题贴合真实地平线投影；只在运镜或尺寸改变时写入位置，静止后无额外循环。
      const horizonY = ((0.5 - screenPoint.y * 0.5) * viewHeight).toFixed(2)
      if (
        stage.style.getPropertyValue('--temple-horizon-y') !== `${horizonY}px`
      )
        stage.style.setProperty('--temple-horizon-y', `${horizonY}px`)
      // 背景裁剪独立于 stage 的入场透明度，避免渐显期间星盘透过地面。
      skyHorizon = `${horizonY}px`
      projectionDirty = false
    }
    syncSkyClip()
    // 几何诊断和其他诊断共用限频；实际投影、画布和点击区域仍逐帧更新。
    if (publishDiagnostics) {
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
      setStageData('cameraZoom', camera.zoom.toFixed(4))
      setStageData('statueZoomDrop', statueZoomDrop().toFixed(4))
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
    if (
      moving ||
      transitionActive ||
      hoverMoving ||
      (immersive && !reducedMotion)
    )
      invalidate()
    else if (wireFlowActive) scheduleFrame()
    else {
      motionIdle = true
      // 静止时仅在下次随机布局到点时唤醒，避免持续绘制 60fps。
      if (dizzySticker.visible && !reducedMotion)
        dizzyFrameTimer = setTimeout(() => {
          dizzyFrameTimer = undefined
          invalidate()
        }, DIZZY_STICKER_FRAME_MS - (now % DIZZY_STICKER_FRAME_MS))
    }
  }
  function invalidate() {
    frameContentDirty = true
    scheduleFrame()
  }
  function scheduleFrame() {
    if (frame === undefined && canRender())
      frame = requestAnimationFrame(render)
  }
  const focusPose = (category: (typeof categories)[number]) => {
    const side = Math.sign(category.x)
    const distance =
      (6.1 * OBELISK_SCALE.y) /
      (2 * Math.tan(THREE.MathUtils.degToRad(templeCamera.fov / 2)) * 0.68)
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
      Math.tan(THREE.MathUtils.degToRad(templeCamera.fov / 2)) *
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
    const halfFov = Math.tan(THREE.MathUtils.degToRad(STATUE_PREVIEW_FOV / 2))
    const distance =
      (Math.max(statueSize.y, statueSize.x / camera.aspect) /
        (2 * halfFov * 0.8) +
        statueSize.z / 2) /
      STATUE_PREVIEW_SCALE
    const target = new THREE.Vector3(0, statueSize.y / 2, statueZ)
    const pitch = THREE.MathUtils.degToRad(STATUE_PREVIEW_PITCH)
    return {
      position: target
        .clone()
        .add(
          new THREE.Vector3(
            0,
            Math.sin(pitch) * distance,
            Math.cos(pitch) * distance
          )
        ),
      target,
    }
  }
  const petFocusCamera = createPetFocusCamera()
  const petScreenBounds = createPetScreenBounds()
  let floraReferenceModel: FloraPetModelAsset | undefined
  let currentPetAssetFacing: number[] | undefined
  let referenceLoad: Promise<FloraPetModelAsset> | undefined
  let referenceIntent = 0
  let referenceLoadingSource: string | undefined
  const clearReferenceCursor = () => {
    if (referenceLoadingSource)
      cursorStateStore.stopLoading(referenceLoadingSource)
    referenceLoadingSource = undefined
  }
  // 非当前物种的参考缓冲只用于宠物聚焦构图，总览和其他模块不需要提前读取。
  const ensurePetReference = () => {
    if (floraReferenceModel) return Promise.resolve(floraReferenceModel)
    if (!referenceLoad)
      referenceLoad = loadFloraPetModel('sprigatito')
        .then((asset) => {
          if (!disposed) floraReferenceModel = asset
          return asset
        })
        .catch((error) => {
          referenceLoad = undefined
          throw error
        })
    return referenceLoad
  }
  const selectedPose = () => {
    if (selected === 'statue') return fullStatuePose()
    if (selected === 'sprigatito') {
      const framingCamera = camera.clone()
      framingCamera.fov = templeCamera.fov
      framingCamera.zoom = 1
      framingCamera.updateProjectionMatrix()
      return petFocusCamera({
        geometry: sprigatitoMesh!.geometry,
        reference: floraReferenceModel,
        camera: framingCamera,
        pet: currentPet,
        position: sleepingSprigatito.position,
        scale: sleepingSprigatito.scale,
        size: sprigatitoSize,
        mobile: config.id === 'mobile',
        referenceWidth: SPRIGATITO_REFERENCE_WIDTH,
      })
    }
    return focusedObelisk
      ? focusPose(focusedObelisk.category)
      : { position: homePosition, target: homeTarget }
  }
  const entranceProgress = { value: 0 }
  const entranceStart = new THREE.Vector3()
  const applyEntranceCamera = () => {
    // 单段中轴线下移：从轻微俯视平滑落到默认机位，无横移、折返或额外推进。
    entranceStart.set(0, templeCamera.entranceY, homePosition.z)
    camera.position
      .copy(entranceStart)
      .lerp(homePosition, entranceProgress.value)
    lookAt.copy(homeTarget)
    projectionDirty = true
  }
  let readyNotified = false
  let entranceCompletionPending = false
  const notifyReady = () => {
    if (!interactionsPrepared || readyNotified) return
    readyNotified = true
    callbacks.ready()
  }
  const finishEntrance = () => {
    entranceCompletionPending = true
    if (!interactionsPrepared) return
    entranceCompletionPending = false
    setStageData('entranceFinished', 'true')
    setStageData('entrancePhase', 'complete')
    notifyReady()
    callbacks.entranceComplete()
  }
  const completeEntrance = (restoreHome = false) => {
    entranceActive = false
    entranceCameraActive = false
    transitionActive = false
    if (restoreHome) {
      camera.position.copy(homePosition)
      lookAt.copy(homeTarget)
      headTarget.copy(pointerTarget)
    }
    projectionDirty = true
    finishEntrance()
    syncActivity()
    invalidate()
  }
  const startEntranceClock = (startTime = 0) => {
    const now = performance.now()
    motionStart = now - (startTime / ENTRANCE_PLAYBACK_RATE) * 1000
    // 新时间轴不继承缓存场景的暂停时间，避免恢复时把半升进度退回到开头。
    pausedAt = document.hidden || !sceneActive ? now : 0
  }
  const fadeIntoStage = () => {
    callbacks.entranceStarted?.()
    // 透明度入场保持已恢复的聚焦构图；ResizeObserver 不应重新应用首次高机位。
    entranceCameraActive = false
    entranceActive = true
    transitionActive = true
    setStageData('entrancePhase', 'fade')
    startEntranceClock()
    transition = gsap
      .timeline({
        paused: true,
        onUpdate: invalidate,
        onComplete: () => completeEntrance(),
      })
      .to(stage, {
        opacity: 1,
        duration: reducedMotion ? 0.01 : 0.65,
        ease: 'power2.out',
      })
  }
  const startEntrance = (
    shortInitialEntrance = simpleEntrance && !preparationEntry
  ) => {
    if (simpleEntrance && !shortInitialEntrance) {
      if (heroEntranceText)
        gsap.set(heroEntranceText, { yPercent: 0, opacity: 1 })
      statueHolyIntensity.value = 1
      entranceHeadDip.value = headNodDegrees
      // 先建立入场低头基准，再定位目标；目标的 0°/5°低头不能被基准覆盖。
      if (preparationEntry) {
        applyingEntrySelection = true
        select(preparationEntry, true)
        applyingEntrySelection = false
      }
      fadeIntoStage()
      return
    }
    if (reducedMotion) {
      stage.style.opacity = '1'
      if (heroEntranceText)
        gsap.set(heroEntranceText, { yPercent: 0, opacity: 1 })
      statueHolyIntensity.value = 1
      entranceHeadDip.value = headNodDegrees
      finishEntrance()
      return
    }
    entranceActive = true
    entranceCameraActive = true
    transitionActive = true
    setStageData('entrancePhase', shortInitialEntrance ? 'pillars' : 'statue')
    entranceProgress.value = 0
    entranceHeadDip.value = 0
    statueHolyIntensity.value = 0
    if (heroEntranceText)
      gsap.set(heroEntranceText, { yPercent: 100, opacity: 0 })
    applyEntranceCamera()
    for (const [index, item] of obelisks.entries()) {
      item.shaft.position.y = -OBELISK_ENTRANCE_DEPTH
      item.shaft.visible = false
      reflectedShafts[index].visible = false
    }
    transition = gsap.timeline({
      paused: true,
      onUpdate: invalidate,
      onComplete: () => completeEntrance(true),
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
      statueHolyIntensity,
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
    const startTime = shortInitialEntrance ? SIMPLE_ENTRANCE_START : 0
    // 初始简易版从正常时间轴的内侧柱半升节点继续，镜头、标题、低头和圣光保持同一进度。
    startEntranceClock(startTime)
    if (shortInitialEntrance) {
      transition.totalTime(startTime)
      setStageData('entrancePhase', 'pillars')
      callbacks.entranceStarted?.()
    }
  }
  const resize = () => {
    viewWidth = stage.clientWidth
    viewHeight = stage.clientHeight
    if (!viewWidth || !viewHeight) return
    const footer = document.querySelector('.footer-com')
    statueLabelFooterHeight = footer
      ? parseFloat(getComputedStyle(footer).height)
      : 0
    updateDrawingBuffer()
    camera.aspect = viewWidth / viewHeight
    if (selected === 'sprigatito' && !transitionActive)
      Object.assign(focusFraming, floraFraming())
    // 偏移投影而非页面容器，场景、倒影和投影点击区域一起下移，导航及离场几何保持原位。
    applyViewOffset()
    homePosition.z = Math.max(
      config.scene.homeCamera.minDistance,
      config.scene.homeCamera.aspectDistance / camera.aspect
    )
    if (entranceActive && entranceCameraActive) applyEntranceCamera()
    else if (!transitionActive || entranceActive) {
      const pose = selectedPose()
      camera.position.copy(pose.position)
      lookAt.copy(pose.target)
    }
    projectionDirty = true
    pointerBoundsDirty = true
    if (diagnosticsEnabled)
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
    menuExited = false,
    statueAligned = false
  ) => {
    if (
      immersive ||
      !ready ||
      disposed ||
      hosted ||
      entranceActive ||
      (!interactionsPrepared && !applyingEntrySelection)
    )
      return
    if (
      id &&
      id !== 'statue' &&
      id !== 'sprigatito' &&
      !obeliskById.get(id)?.category.enabled
    )
      return
    const intent = ++referenceIntent
    clearReferenceCursor()
    if (id === 'sprigatito' && !floraReferenceModel) {
      const source = `pet-framing-${++referenceRequestId}`
      referenceLoadingSource = source
      cursorStateStore.startLoading(source)
      void ensurePetReference()
        .then(() => {
          if (!disposed && !hosted && intent === referenceIntent)
            select(id, immediate, menuExited, statueAligned)
        })
        .catch((error) => {
          if (!disposed && !hosted && intent === referenceIntent)
            console.error(
              'Pet framing reference failed; selection can be retried',
              error
            )
        })
        .finally(() => {
          cursorStateStore.stopLoading(source)
          if (referenceLoadingSource === source)
            referenceLoadingSource = undefined
        })
      return
    }
    const next = selected === id ? null : id
    if (next === selected) return
    if (statueRestorePending && !next) return
    if (menuExitPending && !next && !menuExited) return
    const revision = ++selectionRevision
    const wasStatue = selected === 'statue'
    const wasSprigatito = selected === 'sprigatito'
    if (wasStatue && !next && !immediate && !reducedMotion && !statueAligned) {
      // 先回正，再让扫描、缩小与退镜交叠推进；全过程关闭鼠标跟随。
      // 非空模块选择和外部路由离场不经过这段等待；重复返回也不重启扫描。
      transition?.kill()
      statueRestorePending = true
      transitionActive = true
      cameraMoving = false
      diagnosticsDirty = true
      motionStart = performance.now()
      transition = gsap
        .timeline({
          paused: true,
          onUpdate: () => {
            diagnosticsDirty = true
            invalidate()
          },
          onComplete: () => {
            if (disposed || revision !== selectionRevision) return
            statueRestorePending = false
            transitionActive = false
            select(null, immediate, menuExited, true)
          },
        })
        .to(
          headCurrent,
          {
            x: 0,
            y: 0,
            duration: STATUE_REALIGN_DURATION,
            ease: 'power2.inOut',
          },
          0
        )
        .to(
          statue.rotation,
          {
            x: 0,
            y: 0,
            z: 0,
            duration: STATUE_REALIGN_DURATION,
            ease: 'power2.inOut',
          },
          0
        )
        .to(
          entranceHeadDip,
          {
            value: headNodDegrees,
            duration: STATUE_REALIGN_DURATION,
            ease: 'power2.inOut',
          },
          0
        )
      invalidate()
      return
    }
    statueRestorePending = false
    // 首次进入时记录屏幕起点；中途反向或再次点击继续使用同一路径，避免跳位。
    if (next === 'statue' && statueView.mix === 0) {
      screenPoint.copy(statueLabel.position)
      screenPoint.y -= statueLabelHalfHeight * statueLabel.scale.y
      screenPoint.project(camera)
      statueLabelHomeBottom.set(screenPoint.x, screenPoint.y)
    }
    const wasPillar = !!focusedObelisk
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
    petChangeRevision++
    petFadingOut = false
    petEntrance?.kill()
    petVisibility.value = 1
    petHead.set(0, 0)
    petHeadTarget.set(0, 0)
    selected = next
    syncActivity()
    focusedObelisk =
      next && next !== 'statue' && next !== 'sprigatito'
        ? obeliskById.get(next)
        : undefined
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
    syncStatueLabelTarget(performance.now())
    callbacks.select(selected)
    transition?.kill()
    const item = focusedObelisk
    const duration =
      reducedMotion || immediate
        ? 0.01
        : returningStatue
        ? STATUE_SCAN_DURATION
        : TEMPLE_FOCUS_DURATION
    const statueTransition = selected === 'statue' || wasStatue
    const quick = reducedMotion || immediate
    const scanDuration = quick
      ? 0.01
      : selected === 'statue' || returningStatue
      ? STATUE_SCAN_DURATION *
        Math.abs((selected === 'statue' ? 1 : 0) - statueScan.progress.value)
      : 0.65
    const scanStart =
      selected === 'statue' && !quick
        ? Math.max(0, duration - STATUE_SCAN_ADVANCE)
        : 0
    const environmentDuration = Math.min(STATUE_ENVIRONMENT_DURATION, duration)
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
    // 不为未变化的值创建补间；空补间的 onUpdate 会把静止构图误标成逐帧移动。
    const tweenIfChanged = (
      target: object,
      vars: gsap.TweenVars,
      position: number
    ) => {
      if (
        target instanceof HTMLElement ||
        Object.entries(vars).some(
          ([key, value]) =>
            typeof value === 'number' && key in target && target[key] !== value
        )
      )
        transition!.to(target, vars, position)
    }
    tweenIfChanged(
      sleepingSprigatito.rotation,
      {
        y: THREE.MathUtils.degToRad(
          currentPet.rotationY[selected === 'sprigatito' ? 'focus' : 'home']
        ),
        duration,
        ease: 'power2.inOut',
        onUpdate: markProjectionDirty,
      },
      0
    )
    tweenIfChanged(
      sprigatitoFocus,
      {
        value: selected === 'sprigatito' ? 1 : 0,
        duration: duration * 0.65,
        ease: 'power2.out',
      },
      0
    )
    tweenIfChanged(
      sprigatitoPose,
      {
        value: selected === 'sprigatito' ? 1 : 0,
        duration: reducedMotion || immediate ? 0.01 : 1.1,
        ease: 'power2.inOut',
        onUpdate: markProjectionDirty,
      },
      selected === 'sprigatito' ? duration * 0.75 : wasSprigatito ? duration : 0
    )
    // 头部使用完整时长的角度插值；视角完成独立通知内容挂载，不等待转头或导航渐显。
    tweenIfChanged(
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
      duration
    )
    tweenIfChanged(
      entranceHeadDip,
      {
        value: item
          ? 0
          : selected === 'statue'
          ? headNodDegrees - 5
          : headNodDegrees,
        duration:
          selected === 'statue'
            ? scanDuration
            : item || wasPillar
            ? duration * 2
            : duration,
        ease: selected === 'statue' ? easeIslandFocusZoom : 'power2.inOut',
      },
      selected === 'statue' ? scanStart : 0
    )
    if (returningStatue || selected === 'statue') {
      tweenIfChanged(
        headCurrent,
        {
          x: 0,
          y: 0,
          duration,
          ease: 'power2.inOut',
        },
        0
      )
      tweenIfChanged(
        statue.rotation,
        { y: 0, z: 0, duration, ease: 'power2.inOut' },
        0
      )
    }
    tweenIfChanged(
      templeReveal,
      {
        value: selected === 'statue' ? 0 : 1,
        duration: environmentDuration,
        ease: 'power2.inOut',
        onUpdate: markProjectionDirty,
      },
      0
    )
    const heroTitle = stage.querySelector<HTMLElement>('.temple-backdrop')
    tweenIfChanged(
      statueHolyIntensity,
      {
        value: selected ? 0 : 1,
        duration: statueTransition
          ? environmentDuration
          : Math.min(0.45, duration),
        ease: 'power2.out',
      },
      0
    )
    if (heroTitle)
      tweenIfChanged(
        heroTitle,
        {
          opacity: selected === 'statue' ? 0 : selected ? 0.2 : 1,
          scale: selected === 'statue' ? 1 + STATUE_ENVIRONMENT_EXPANSION : 1,
          duration: statueTransition ? environmentDuration : duration * 0.65,
          ease: statueTransition ? 'power2.inOut' : 'power2.out',
        },
        0
      )
    const pose = selectedPose()
    tweenIfChanged(
      statueView,
      { mix: selected === 'statue' ? 1 : 0, duration, ease: 'power2.inOut' },
      0
    )
    // 扫描与放大共用场景时间轴，中断和后台恢复时一起取消或继续。
    if (statueScan.progress.value !== (selected === 'statue' ? 1 : 0))
      transition.to(
        statueScan.progress,
        {
          value: selected === 'statue' ? 1 : 0,
          duration: scanDuration,
          ease: 'power1.inOut',
          onUpdate: () => {
            diagnosticsDirty = true
          },
        },
        scanStart
      )
    // 独立柔和缓动与扫描同步起止；回程倍率并入退镜，不单独原地缩小。
    const targetZoom = selected === 'statue' ? STATUE_FOCUS_ZOOM : 1
    if (!returningStatue && camera.zoom !== targetZoom)
      transition.to(
        camera,
        {
          zoom: targetZoom,
          duration: quick
            ? 0.01
            : selected === 'statue'
            ? scanDuration
            : STATUE_ZOOM_DURATION,
          ease: selected === 'statue' ? easeIslandFocusZoom : 'power2.inOut',
          onUpdate: () => {
            markViewOffsetDirty()
            diagnosticsDirty = true
          },
        },
        scanStart
      )
    // 保留当前裁切面作为起点，跟随模型升降逐步释放下半身；中途反向也不会跳变。
    tweenIfChanged(
      statueClipPlane,
      {
        constant: selected === 'statue' ? 0.1 : -0.52,
        duration,
        ease: 'power3.inOut',
      },
      0
    )
    tweenIfChanged(
      focusFraming,
      {
        x: item
          ? Math.sign(item.category.x) * config.scene.focus.screenOffset
          : selected === 'sprigatito'
          ? floraFraming().x
          : 0,
        y:
          selected === 'statue'
            ? STATUE_PREVIEW_VERTICAL_OFFSET
            : selected === 'sprigatito'
            ? floraFraming().y
            : 0,
        duration,
        ease: 'power3.inOut',
        onUpdate: markViewOffsetDirty,
      },
      0
    )
    const useDollyCamera = selected === 'statue' || returningStatue
    if (useDollyCamera) {
      const targetFov =
        selected === 'statue' ? STATUE_PREVIEW_FOV : templeCamera.fov
      const updateCamera = createDollyCameraMotion(
        camera,
        lookAt,
        pose,
        targetFov,
        returningStatue ? 1 : undefined,
        markViewOffsetDirty
      )
      const dolly = { progress: 0, fovProgress: 0 }
      const updateDolly = () => {
        updateCamera(
          dolly.progress,
          selected === 'statue' ? dolly.fovProgress : dolly.progress
        )
      }
      // 入场广角全部并入第二段放大；距离补偿继续沿用同一投影尺度，避免交界处跳变。
      if (selected === 'statue')
        tweenIfChanged(
          dolly,
          {
            fovProgress: 1,
            duration: scanDuration,
            ease: easeIslandFocusZoom,
            onUpdate: updateDolly,
          },
          scanStart
        )
      // 视点、俯仰、投影尺度与模型升起共用进度；方向归一化，避免混合角度压缩距离。
      tweenIfChanged(
        dolly,
        {
          progress: 1,
          duration,
          ease: 'power3.inOut',
          onUpdate: updateDolly,
        },
        0
      )
    } else {
      tweenIfChanged(
        camera,
        {
          fov: templeCamera.fov,
          duration,
          ease: 'power3.inOut',
          onUpdate: () => {
            markViewOffsetDirty()
          },
        },
        0
      )
    }
    if (selected === 'sprigatito') {
      // 模型保持原朝向，相机沿最短圆弧转到头朝画面右侧的侧视机位。
      const offset = camera.position.clone().sub(pose.target)
      const startAngle = Math.atan2(offset.x, offset.z)
      const endAngle = Math.atan2(
        pose.position.x - pose.target.x,
        pose.position.z - pose.target.z
      )
      const delta = Math.atan2(
        Math.sin(endAngle - startAngle),
        Math.cos(endAngle - startAngle)
      )
      const startRadius = Math.hypot(offset.x, offset.z)
      const endRadius = Math.hypot(
        pose.position.x - pose.target.x,
        pose.position.z - pose.target.z
      )
      const startY = camera.position.y
      const orbit = { progress: 0 }
      tweenIfChanged(
        orbit,
        {
          progress: 1,
          duration,
          ease: 'power3.inOut',
          onUpdate: () => {
            const angle = startAngle + delta * orbit.progress
            const radius = THREE.MathUtils.lerp(
              startRadius,
              endRadius,
              orbit.progress
            )
            camera.position.set(
              pose.target.x + Math.sin(angle) * radius,
              THREE.MathUtils.lerp(startY, pose.position.y, orbit.progress),
              pose.target.z + Math.cos(angle) * radius
            )
            markProjectionDirty()
          },
        },
        0
      )
    } else if (!useDollyCamera)
      tweenIfChanged(
        camera.position,
        {
          x: pose.position.x,
          y: pose.position.y,
          z: pose.position.z,
          duration,
          ease: 'power3.inOut',
          onUpdate: markProjectionDirty,
        },
        0
      )
    if (!useDollyCamera)
      tweenIfChanged(
        lookAt,
        {
          x: pose.target.x,
          y: pose.target.y,
          z: pose.target.z,
          duration,
          ease: 'power3.inOut',
          onUpdate: markProjectionDirty,
        },
        0
      )
    tweenIfChanged(
      statue.position,
      {
        y: selected === 'statue' ? statueFullY : statueHalfY,
        z:
          statueZ -
          (selected === 'sprigatito' || (item && item.category.z < 0)
            ? INNER_STATUE_RETREAT
            : 0),
        duration,
        ease: 'power3.inOut',
        onUpdate: markProjectionDirty,
      },
      0
    )
    for (const [index, obelisk] of obelisks.entries()) {
      tweenIfChanged(
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
        0
      )
      tweenIfChanged(
        obelisk,
        {
          strength: obelisk === item ? 1 : 0,
          duration: duration * 0.65,
          ease: 'power2.out',
        },
        0
      )
      moveShaft(
        transition,
        index,
        selected !== 'statue' &&
          selected !== 'sprigatito' &&
          (!item || obelisk === item)
          ? 0
          : -OBELISK_ENTRANCE_DEPTH,
        statueTransition ? environmentDuration : duration,
        0
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
    if (sprigatitoMesh && sleepingSprigatito.visible)
      visibleHitObjects.push(sprigatitoMesh)
    const hit = raycaster
      .intersectObjects(visibleHitObjects, false, intersections)
      .find(
        (hit) =>
          hit.point.y >=
          (hit.object === sprigatitoMesh
            ? 0
            : hit.object === statueMesh
            ? -statueClipPlane.constant
            : OBELISK_BASE_TOP * OBELISK_SCALE.y) -
            0.001
      )
    if (!hit) return
    return hit.object === sprigatitoMesh
      ? 'sprigatito'
      : hit.object === statueMesh
      ? 'statue'
      : (hit.object.userData.category as TempleCategoryId)
  }
  const click = (event: MouseEvent) => {
    if (hosted || immersive) return
    if (selected === 'sprigatito' && callbacks.dismissBackground?.()) return
    if (selected === 'statue') return select(null)
    const id = raycast(event, true)
    if (id === 'statue') select(selected ? null : 'statue')
    else if (id) select(id)
    else if (selected && !callbacks.dismissBackground?.()) select(null)
  }
  renderer.domElement.addEventListener('click', click)
  renderer.domElement.tabIndex = 0
  const modelKeydown = (event: KeyboardEvent) => {
    if (hosted || disposed || immersive) return
    if (event.key === 'Escape' && referenceLoadingSource) {
      referenceIntent++
      clearReferenceCursor()
      return
    }
    if (event.key !== 'Escape' && event.key !== 'Enter' && event.key !== ' ')
      return
    if (document.querySelector('.about-overlay')) return
    // 弹窗拥有 Esc 的优先权，关闭作品详情时不能同时退出神殿聚焦。
    if (
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '.el-dialog, .el-message-box, .el-image-viewer__wrapper, .video-modal'
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
    // 相同坐标、相同命中元素在稳定构图中无需重复拾取或唤醒 GPU。
    // 运镜、入场、返回与宠物聚焦仍走完整逻辑，保留静止指针的状态同步。
    if (
      hasPointer &&
      event.clientX === lastPointer.x &&
      event.clientY === lastPointer.y &&
      event.target === lastPointerEventTarget &&
      selected !== 'sprigatito' &&
      !entranceActive &&
      !transitionActive &&
      !cameraMoving &&
      !projectionDirty &&
      !pointerBoundsDirty &&
      !returningStatue &&
      !returningPillar
    )
      return
    hasPointer = true
    lastPointerEventTarget = event.target
    lastPointer.set(event.clientX, event.clientY)
    if (!returningPillar)
      pointerTarget
        .set(
          (event.clientX / innerWidth - 0.5) * 2,
          (event.clientY / innerHeight - 0.5) * 2
        )
        .clampScalar(-1, 1)
    if (selected === 'sprigatito') {
      if (event.pointerType === 'touch') return
      if (
        !transitionActive &&
        !cameraMoving &&
        !petEntrance?.isActive() &&
        sprigatitoPose.value === 1
      ) {
        // 朝向包含原始网格方向；小黑原生朝 -X，不能按花花的 +Z 推断转头正负。
        const modelHeading = currentPetAssetFacing
          ? Math.atan2(currentPetAssetFacing[0], currentPetAssetFacing[2])
          : 0
        const azimuth =
          Math.atan2(
            camera.position.x - lookAt.x,
            camera.position.z - lookAt.z
          ) -
          sleepingSprigatito.rotation.y -
          modelHeading
        const horizontal = THREE.MathUtils.clamp(
          (event.clientX / viewWidth - 0.5) * 2,
          -1,
          1
        )
        const vertical = THREE.MathUtils.clamp(
          (event.clientY / viewHeight - 0.5) * 2,
          -1,
          1
        )
        petHeadTarget
          .set(horizontal * Math.cos(azimuth), vertical)
          .multiplyScalar(2)
        diagnosticsDirty = true
        invalidate()
      }
      return
    }
    const hit =
      !immersive && !cameraMoving && isSceneTarget(event.target)
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
      petEntrance?.pause()
      unsubscribe?.()
      unsubscribe = undefined
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (dizzyFrameTimer !== undefined) clearTimeout(dizzyFrameTimer)
      frame = undefined
      if (!pausedAt) pausedAt = performance.now()
    } else {
      themeTransition?.resume()
      petEntrance?.resume()
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
    petHeadTarget.set(0, 0)
    diagnosticsDirty = true
    pointerTarget.set(0, 0)
    if (
      (!selected || selected === 'statue') &&
      !returningStatue &&
      !returningPillar
    )
      headTarget.copy(pointerTarget)
    statueHovered = false
    hovered = null
    syncStatueLabelTarget(performance.now())
    cursorStateStore.setInteractive(statueCursorSource, false)
    invalidate()
  }
  document.documentElement.addEventListener('pointerleave', resetPointer)
  window.addEventListener('blur', resetPointer)

  const prepareRendering = async () => {
    pillarBatches = createPillarBatches(
      monuments,
      obelisks.map((item) => item.group),
      scene,
      new Set([glowMap])
    )
    reflectionBatches = createPillarBatches(
      reflection,
      reflectedObelisks,
      scene
    )
    staticSceneCache.setObjects([
      monuments,
      pedestal,
      ...reflectedObelisks,
      reflectedPedestal,
      ...reflectionBatches.objects,
    ])
    pillarBatches.setEnabled(true)
    reflectionBatches.setEnabled(true)
    // 固定子网格只烘焙一次局部矩阵；父组运镜仍照常更新世界矩阵和倒影。
    const movingTransforms = new Set<THREE.Object3D>([
      ground,
      pedestal,
      reflectedPedestal,
      statue,
      dizzySticker,
      reflectedStatue!,
      sleepingSprigatito,
      reflectedSprigatito!,
      sprigatitoBeam,
      sprigatitoPool,
      ...spotLightPool.objects,
      statueGlow,
      statueLight,
      statueHolyLight,
      statueLabel,
      ...reflectedObelisks,
      ...reflectedShafts,
      ...obelisks.flatMap((item) => [item.group, item.shaft, item.capHalo]),
    ])
    updateSceneMatrices = createSceneMatrixUpdater(scene, movingTransforms)
    updateSceneMatrices()
    camera.lookAt(lookAt)
    camera.updateMatrixWorld()
    updateEnvironmentQueues?.()
    pillarBatches.update()
    reflectionBatches.update()
    // 零强度光池也初始化实例缓冲，首次聚焦只改 uniform。
    for (const object of [
      ...pillarBatches.objects,
      ...reflectionBatches.objects,
    ])
      object.visible = true
    preparationEntry = callbacks.entrySelection?.() ?? null
    const entrySpotCount =
      preparationEntry && preparationEntry !== 'statue' ? 1 : 0
    setStageData('preparationEntry', preparationEntry || 'home')
    shaderWarmup = createShaderWarmup(
      renderer,
      scene,
      camera,
      // 光池只在聚焦时首次出现；Basic 虽不执行灯光，首次初始化的缓存键仍包含灯数。
      (value) =>
        value instanceof THREE.MeshBasicMaterial && value.map === glowMap
    )
    const initialJobs: (() => Promise<void>)[] = []
    const interactionJobs: (() => Promise<void>)[] = []
    // 先快照两种队列；之后后台编译不再修改真实场景的透明度、灯光或材质。
    for (const reveal of [1, 0.5]) {
      templeReveal.value = reveal
      updateEnvironmentQueues?.()
      pillarBatches.update()
      reflectionBatches.update()
      for (const count of [0, 1, 2]) {
        for (const clips of [0, 1]) {
          const job = shaderWarmup.capture(count, clips)
          ;(count === 0 || count === entrySpotCount
            ? initialJobs
            : interactionJobs
          ).push(job)
        }
      }
    }
    templeReveal.value = 1
    updateEnvironmentQueues?.()
    await shaderWarmup.run(initialJobs)
    initialJobs.length = 0
    if (disposed) return
    spotLightPool.update()
    updateSceneMatrices()
    pillarBatches.update()
    reflectionBatches.update()
    staticSceneCache.prepare()
    // 上传共享几何和纹理；后续状态只编译程序，不重复实际绘制整个环境。
    renderer.render(scene, camera)
    if (diagnosticsEnabled) {
      setStageData(
        'initialShaderPrograms',
        String(renderer.info.programs?.length || 0)
      )
    }
    setStageData('shaderWarmup', 'entry-ready')
    prepareInteractions = async () => {
      await shaderWarmup!.run(interactionJobs, true)
      interactionJobs.length = 0
      if (disposed) return
      interactionsPrepared = true
      setStageData('shaderWarmup', 'complete')
      if (diagnosticsEnabled) {
        setStageData(
          'preparedShaderPrograms',
          String(renderer.info.programs?.length || 0)
        )
      }
      if (entranceCompletionPending) finishEntrance()
    }
  }

  const createPetGeometry = (sleepingModel: FloraPetModelAsset) => {
    const sleepingSurface = geometry(new THREE.BufferGeometry())
    for (const [target, source] of [
      ['position', 'positions'],
      ['normal', 'normals'],
    ] as const) {
      const attribute = sleepingModel.metadata.attributes[source]
      sleepingSurface.setAttribute(
        target,
        new THREE.BufferAttribute(
          new Float32Array(
            sleepingModel.buffer,
            attribute.offset,
            attribute.count
          ),
          3
        )
      )
    }
    const sleepingIndices = sleepingModel.metadata.attributes.indices
    for (const [target, sources] of [
      ['position', ['raisedPositions', 'yawPositions', 'pitchPositions']],
      ['normal', ['raisedNormals', 'yawNormals', 'pitchNormals']],
    ] as const) {
      sleepingSurface.morphAttributes[target] = sources.map((source) => {
        const attribute = sleepingModel.metadata.attributes[source]
        return new THREE.BufferAttribute(
          new Float32Array(
            sleepingModel.buffer,
            attribute.offset,
            attribute.count
          ),
          3
        )
      })
    }
    sleepingSurface.setIndex(
      new THREE.BufferAttribute(
        new Uint16Array(
          sleepingModel.buffer,
          sleepingIndices.offset,
          sleepingIndices.count
        ),
        1
      )
    )
    sleepingSurface.computeBoundingBox()
    sleepingSurface.computeBoundingSphere()
    sleepingSurface.userData.sleepMinY =
      new THREE.Box3().setFromBufferAttribute(
        sleepingSurface.getAttribute('position')
      ).min.y
    return sleepingSurface
  }
  const updatePetSize = (sleepingModel: FloraPetModelAsset) => {
    const width =
      currentPet.model === 'sprigatito'
        ? SPRIGATITO_REFERENCE_WIDTH
        : sleepingModel.metadata.size[0]
    sleepingSprigatito.scale.setScalar(
      ((config.id === 'mobile' ? 0.7 : 1.1) * currentPet.displayScale) / width
    )
    // 以睡姿实际最低点落地，而非动画骨骼原点；不同物种不会悬空或被地面吞没。
    sleepingSprigatito.position.y =
      0.035 -
      sprigatitoMesh!.geometry.userData.sleepMinY * sleepingSprigatito.scale.x
    sleepingSprigatito.rotation.y = THREE.MathUtils.degToRad(
      currentPet.rotationY[selected === 'sprigatito' ? 'focus' : 'home']
    )
    sprigatitoSize
      .fromArray(sleepingModel.metadata.size)
      .multiplyScalar(sleepingSprigatito.scale.x)
    if (reflectedSprigatito)
      reflectedSprigatito.scale.copy(sleepingSprigatito.scale)
  }
  const publishPet = (asset: FloraPetModelAsset) => {
    currentPetAssetFacing = asset.metadata.facingDirection
    stage.dataset.companion = currentPet.model
    stage.dataset.petId = currentPet.id
    if (diagnosticsEnabled) {
      stage.dataset.companionPose =
        currentPet.model === 'sprigatito' && sprigatitoPose.value === 0
          ? 'sleep'
          : currentPet.pose
      setStageData('companionVisibility', petVisibility.value.toFixed(3))
      stage.dataset.companionMaterial = 'chrome-wireframe'
      stage.dataset.companionWidth = String(sprigatitoSize.x)
      stage.dataset.companionReflectionScaleY = String(
        reflectedSprigatito!.scale.y / sleepingSprigatito.scale.y
      )
      stage.dataset.companionEntrance = currentPet.entrance
      stage.dataset.companionRevision = asset.revision
      stage.dataset.companionFaces = String(
        asset.metadata.attributes.indices.count / 3
      )
      stage.dataset.companionGroundY = String(
        sleepingSprigatito.position.y +
          sprigatitoMesh!.geometry.userData.sleepMinY *
            sleepingSprigatito.scale.x
      )
    }
  }
  const animatePetEntrance = (pet: PetProfile) => {
    petEntrance = gsap.timeline({
      onUpdate: invalidate,
      onComplete: () => {
        cameraMoving = false
        projectionDirty = true
        diagnosticsDirty = true
        invalidate()
      },
    })
    petEntrance.to(
      petVisibility,
      { value: 1, duration: reducedMotion ? 0.01 : 0.42, ease: 'power2.out' },
      0
    )
    if (selected === 'sprigatito') {
      const pose = selectedPose()
      const startPosition = camera.position.clone()
      const startTarget = lookAt.clone()
      const startOffset = startPosition.clone().sub(startTarget)
      const endOffset = pose.position.clone().sub(pose.target)
      const startAngle = Math.atan2(startOffset.x, startOffset.z)
      const endAngle = Math.atan2(endOffset.x, endOffset.z)
      const delta = Math.atan2(
        Math.sin(endAngle - startAngle),
        Math.cos(endAngle - startAngle)
      )
      const orbit = { value: 0 }
      cameraMoving = true
      petEntrance.to(
        orbit,
        {
          value: 1,
          duration: reducedMotion ? 0.01 : 1.05,
          ease: 'power3.inOut',
          onUpdate: () => {
            lookAt.lerpVectors(startTarget, pose.target, orbit.value)
            // 中段轻微拉远，给两只宠物的尺寸变化留出空间，然后平滑收回。
            const radius =
              THREE.MathUtils.lerp(
                Math.hypot(startOffset.x, startOffset.z),
                Math.hypot(endOffset.x, endOffset.z),
                orbit.value
              ) *
              (1 + Math.sin(Math.PI * orbit.value) * 0.07)
            const angle = startAngle + delta * orbit.value
            camera.position.set(
              lookAt.x + Math.sin(angle) * radius,
              THREE.MathUtils.lerp(
                startPosition.y,
                pose.position.y,
                orbit.value
              ),
              lookAt.z + Math.cos(angle) * radius
            )
            markProjectionDirty()
          },
        },
        0
      )
      petEntrance.to(
        sleepingSprigatito.rotation,
        {
          y: THREE.MathUtils.degToRad(pet.rotationY.focus),
          duration: reducedMotion ? 0.01 : 1.05,
          ease: 'power2.inOut',
          onUpdate: markProjectionDirty,
        },
        0
      )
      petEntrance.to(
        sprigatitoPose,
        {
          value: 1,
          duration: reducedMotion ? 0.01 : 1.1,
          ease: 'power2.inOut',
          onUpdate: markProjectionDirty,
        },
        reducedMotion ? 0 : 0.25
      )
      const framing = floraFraming()
      petEntrance.to(
        focusFraming,
        {
          ...framing,
          duration: reducedMotion ? 0.01 : 1.05,
          ease: 'power3.inOut',
          onUpdate: markViewOffsetDirty,
        },
        0
      )
    }
  }
  const setPet = async (pet: PetProfile) => {
    const revision = ++petChangeRevision
    const asset = await loadFloraPetModel(pet.model)
    if (disposed || revision !== petChangeRevision || !sprigatitoMesh)
      return false
    if (currentPet.id === pet.id) {
      // 再次选中当前宠物仅取消尚未提交的切换，不能把它的入场动作停在半途。
      if (petFadingOut) {
        petEntrance?.kill()
        petFadingOut = false
        transition?.kill()
        transitionActive = false
        animatePetEntrance(pet)
      }
      return true
    }
    petEntrance?.kill()
    petHead.set(0, 0)
    petHeadTarget.set(0, 0)
    petFadingOut = true
    // 资源就绪后再淡出；中途切换通过版本号和 onInterrupt 解开等待。
    await new Promise<void>((resolve) => {
      petEntrance = gsap
        .timeline({ onComplete: resolve, onInterrupt: resolve })
        .to(petVisibility, {
          value: 0,
          duration: reducedMotion ? 0.01 : 0.22,
          ease: 'power2.in',
          onUpdate: invalidate,
        })
    })
    if (disposed || revision !== petChangeRevision) return false
    petFadingOut = false
    if (diagnosticsEnabled) delete stage.dataset.companionScreenBounds
    const nextGeometry = createPetGeometry(asset)
    const previous = sprigatitoMesh.geometry
    petEntrance?.kill()
    transition?.kill()
    transitionActive = false
    cameraMoving = false
    currentPet = pet
    sprigatitoPose.value = 0
    for (const mesh of petMeshes) {
      if (!mesh) continue
      mesh.geometry = nextGeometry
      mesh.updateMorphTargets()
    }
    geometries.delete(previous)
    previous.dispose()
    // 驻留场景会跨路由使用，释放旧 GPU 缓冲后也移除 CPU 几何持有者。
    geometries.delete(previous)
    updatePetSize(asset)
    if (selected === 'sprigatito')
      sleepingSprigatito.rotation.y = THREE.MathUtils.degToRad(
        pet.rotationY.home
      )
    sprigatitoTheme.set(pet.themeColor)
    sprigatitoLightColorsReady = false
    appearance.sprigatitoHover = NaN
    const tint = tintByColor.get(sprigatitoSurface!.color)!
    const accent = sprigatitoTheme.getHSL({ h: 0, s: 0, l: 0 })
    sprigatitoHoverColor.setHSL(
      tint.h + accent.h - themeOrigin.h,
      Math.min(1, (tint.s * accent.s) / themeOrigin.s),
      tint.l
    )
    animatePetEntrance(pet)
    publishPet(asset)
    projectionDirty = true
    diagnosticsDirty = true
    invalidate()
    return true
  }

  const releaseResources = () => {
    shaderWarmup?.dispose()
    labelSubscriptions.forEach((unsubscribe) => unsubscribe())
    geometries.forEach((value) => value.dispose())
    materials.forEach((value) => value.dispose())
    textures.forEach((value) => value.dispose())
    pillarBatches?.dispose()
    reflectionBatches?.dispose()
    spotLightPool.dispose()
    staticSceneCache.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }

  preloadTempleAssets(model.load, () => loadFloraPetModel(currentPet.model))
    .then(
      async ([
        { metadata, buffer, environment, radiance },
        sleepingModel,
        labelModel,
      ]) => {
        floraReferenceModel =
          currentPet.model === 'sprigatito' ? sleepingModel : undefined
        if (callbacks.entrySelection?.() === 'sprigatito')
          await ensurePetReference()
        if (disposed) return
        callbacks.progress(60)
        fillTempleLabelGeometry(statueLabelGeometry, labelModel)
        statueLabelHalfHeight = labelModel.metadata.halfHeight
        statueLabelDepth = labelModel.metadata.depth
        statueLabel.position.y = 0.52 + statueLabelHalfHeight
        publishLabelTier(labelModel)
        labelLod = createTempleLabelLod({
          mode: templeLabelQuality,
          mesh: statueLabel,
          initial: labelModel,
          register: geometry,
          invalidate,
          changed: publishLabelTier,
        })
        const sleepingSurface = createPetGeometry(sleepingModel)
        // 复用雕像的金属材质参数，不沿用雕像专属的裁切平面与头部变形。
        const sleepingMaterial = material(chromeMaterial.clone())
        sleepingMaterial.clippingPlanes = null
        sprigatitoSurface = sleepingMaterial
        trackTint(sleepingMaterial.color)
        const baseTint = tintByColor.get(sleepingMaterial.color)!
        const accent = sprigatitoTheme.getHSL({ h: 0, s: 0, l: 0 })
        sprigatitoHoverColor.setHSL(
          baseTint.h + accent.h - themeOrigin.h,
          Math.min(1, (baseTint.s * accent.s) / themeOrigin.s),
          baseTint.l
        )
        sprigatitoMesh = new THREE.Mesh(sleepingSurface, sleepingMaterial)
        sprigatitoMesh.name = 'sprigatito-surface'
        cacheMorphRaycastVertices(sprigatitoMesh)
        sprigatitoMesh.renderOrder = 1
        sleepingSprigatito.add(sprigatitoMesh)
        sprigatitoWireDepth = sprigatitoMesh.clone()
        sprigatitoWireDepth.name = 'sprigatito-wire-depth'
        sleepingSprigatito.add(sprigatitoWireDepth)
        sprigatitoWire = applyModelWireframe(
          sprigatitoWireDepth,
          sleepingMaterial
        )
        sprigatitoWire.name = 'sprigatito-wire'
        updatePetSize(sleepingModel)
        reflectedSprigatito = mirror(
          sleepingSprigatito,
          petReflectionOpacity,
          true
        )
        reflectedSprigatitoSurface = reflectedSprigatito.getObjectByName(
          'sprigatito-surface'
        ) as THREE.Mesh
        reflectedSprigatitoWire = reflectedSprigatito.getObjectByName(
          'sprigatito-wire'
        ) as THREE.Mesh
        reflectedSprigatitoWireDepth = reflectedSprigatito.getObjectByName(
          'sprigatito-wire-depth'
        ) as THREE.Mesh
        reflectedSprigatito.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            reflectedSprigatitoMeshes.push(object)
            if (object.material.colorWrite)
              trackTint((object.material as THREE.MeshBasicMaterial).color)
          }
        })
        petMeshes = [
          sprigatitoMesh!,
          sprigatitoWire!,
          sprigatitoWireDepth!,
          ...reflectedSprigatitoMeshes,
        ]
        publishPet(sleepingModel)
        if (diagnosticsEnabled) {
          stage.dataset.wireframeObelisks = obelisks
            .filter((item) => isTempleWireframeModel(item.category.id))
            .map((item) => item.category.id)
            .join(',')
        }
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
        scene.environmentRotation.y = THREE.MathUtils.degToRad(-100)
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
        headacheHeightRange.value.set(
          model.cropY,
          metadata.center[1] + metadata.size[1] / 2
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
        if (headacheEnabled && headache) prepareHeadachePose(surface, headache)
        const mesh = new THREE.Mesh(surface, chromeMaterial)
        if (mesh.morphTargetInfluences)
          mesh.morphTargetInfluences[0] = headacheMix
        cacheMorphRaycastVertices(mesh)
        mesh.position.fromArray(metadata.center).multiplyScalar(-1)
        // 半身模型在当前尺寸上放大 10%，裁切面仍与底座台面齐平。
        const cropY = model.cropY
        const modelScale = model.displayHeight / metadata.size[1]
        statue.scale.setScalar(modelScale)
        statue.position.y = 0.52 - (cropY - metadata.center[1]) * modelScale
        statue.add(mesh)
        statueMesh = mesh
        reflectedStatue = mirror(statue, 0.52, true)
        // 模型倒影在异步加载后创建，同样加入主题更新，保持镜像色一致。
        reflectedStatue.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.morphTargetInfluences = mesh.morphTargetInfluences
            trackTint((object.material as THREE.MeshPhysicalMaterial).color)
          }
        })
        setThemeColor(stage.dataset.themeColor || experience.themeColor, false)
        surface.computeBoundingBox()
        const bounds = surface.boundingBox!
        bounds.getSize(statueSize).multiplyScalar(modelScale)
        statueScan.bounds.value.set(bounds.min.y, bounds.max.y - bounds.min.y)
        statueHalfY = statue.position.y
        statueFullY = (metadata.center[1] - bounds.min.y) * modelScale
        const wireGeometry = geometry(createBarycentricGeometry(surface))
        statueWire = new THREE.Mesh(wireGeometry, wireMaterial)
        if (diagnosticsEnabled) {
          setStageData(
            'scanGeometryBytes',
            String(
              (
                [
                  ...Object.values(wireGeometry.attributes),
                  ...Object.values(wireGeometry.morphAttributes).flat(),
                ] as THREE.BufferAttribute[]
              ).reduce(
                (bytes, attribute) => bytes + attribute.array.byteLength,
                wireGeometry.index?.array.byteLength ?? 0
              )
            )
          )
        }
        statueWire.morphTargetInfluences = mesh.morphTargetInfluences
        statueWire.position.copy(mesh.position)
        statueWire.renderOrder = 6
        statue.add(statueWire)
        statueWireDepth = new THREE.Mesh(surface, wireDepthMaterial)
        statueWireDepth.morphTargetInfluences = mesh.morphTargetInfluences
        statueWireDepth.position.copy(mesh.position)
        statueWireDepth.renderOrder = 5
        // 全身预览清空环境深度；回程保留底座深度，让网格与实体一起被底座自然遮挡。
        statueWireDepth.onBeforeRender = () => {
          if (selected === 'statue') renderer.clearDepth()
        }
        statue.add(statueWireDepth)
        installTempleFade()
        if (diagnosticsEnabled)
          for (const [name, value] of Object.entries(metadata.stats))
            stage.dataset[name] = String(value)
        if (diagnosticsEnabled) stage.dataset.materialPhase = 'chrome'
        preparation = prepareRendering()
        await preparation
        if (disposed) return
        callbacks.progress(100)
        callbacks.prepared()
        setStageData('entrancePhase', 'waiting-route')
        await callbacks.waitForRouteEnter()
        if (callbacks.entrySelection?.() === 'sprigatito')
          await ensurePetReference()
        if (disposed) return
        ready = true
        startEntrance()
        render(performance.now())
        renderer.domElement.style.visibility = 'visible'
        syncActivity()
        preparation = prepareInteractions!()
        await preparation
        syncActivity()
      }
    )
    .catch((error) => {
      if (!disposed) callbacks.error(error)
    })

  const disconnectHostEvents = () => {
    observer.disconnect()
    document.removeEventListener('visibilitychange', syncActivity)
    document.removeEventListener('keydown', modelKeydown)
    document.documentElement.removeEventListener('pointerleave', resetPointer)
    window.removeEventListener('blur', resetPointer)
  }
  const connectHostEvents = () => {
    observer.observe(stage)
    document.addEventListener('visibilitychange', syncActivity)
    document.addEventListener('keydown', modelKeydown)
    document.documentElement.addEventListener('pointerleave', resetPointer)
    window.addEventListener('blur', resetPointer)
  }
  const canResumeFromHost = () =>
    !disposed &&
    !hostContextInvalid &&
    readyNotified &&
    !renderer.getContext().isContextLost()
  const suspendForHost = () => {
    // 未完成准备、错误场景不驻留，沿用原来的异步释放路径。
    if (!canResumeFromHost() || entranceActive || statueRestorePending)
      return false
    hosted = true
    hostRevision++
    referenceIntent++
    clearReferenceCursor()
    resetPointer()
    syncActivity()
    disconnectHostEvents()
    selectionRevision++
    petChangeRevision++
    // 去掉旧页面回调后再终结补间，避免触发已卸载组件、菜单和路由状态。
    callbacks = {
      waitForRouteEnter: () => Promise.resolve(),
      progress: () => {},
      prepared: () => {},
      ready: () => {},
      entranceComplete: () => {},
      select: () => {},
      beforeReturn: () => undefined,
      settled: () => {},
      error: () => {},
    }
    transition?.totalProgress(1)
    transition?.kill()
    transition = undefined
    petEntrance?.totalProgress(1)
    petEntrance?.kill()
    petEntrance = undefined
    immersionTween?.kill()
    immersionTween = undefined
    immersive = false
    setStageData('immersive', 'false')
    immersionDim.value = 0
    for (const entry of immersionLabelOpacity)
      entry.material.opacity = entry.opacity
    transitionActive =
      cameraMoving =
      menuExitPending =
      statueRestorePending =
      returningStatue =
      returningPillar =
        false
    petFadingOut = false
    petVisibility.value = 1
    statueHover.value = sprigatitoHover.value = 0
    environmentHover.value = focusedObelisk || selected === 'sprigatito' ? 1 : 0
    headCurrent.copy(headTarget)
    petHead.set(0, 0)
    // 只保留纯场景与 canvas。旧 stage、按钮和标题会通过 Vue DOM 回指整棵组件树。
    const parking = document.createElement('div')
    Object.assign(parking.dataset, stage.dataset)
    parking.appendChild(renderer.domElement)
    stage = parking
    buttons = new Map()
    buttonStyles.clear()
    heroEntranceText = null
    renderer.domElement.style.visibility = 'hidden'
    document.documentElement.style.removeProperty('--temple-sky-bottom')
    return true
  }
  const retainedBytes = () => {
    // 保守估算默认缓冲、MSAA 与颜色/深度缓存；不把此值当真实 GPU 内存读数。
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    let bytes = size.x * size.y * 48
    const buffers = new Set<ArrayBufferLike>()
    for (const value of geometries) {
      for (const attribute of [
        value.index,
        ...Object.values(value.attributes),
        ...Object.values(value.morphAttributes).flat(),
      ]) {
        if (attribute && 'array' in attribute)
          buffers.add(attribute.array.buffer)
      }
    }
    for (const buffer of buffers) bytes += buffer.byteLength
    for (const value of textures) {
      const image = value.image
      if (image?.data?.byteLength) bytes += image.data.byteLength
      else if (image?.width && image?.height)
        bytes += image.width * image.height * 4
    }
    return bytes
  }
  const attachFromHost = (
    nextStage: HTMLElement,
    nextButtons: Map<string, HTMLElement>,
    nextCallbacks: TempleCallbacks
  ) => {
    const previousData = { ...stage.dataset }
    stage = nextStage
    buttons = nextButtons
    callbacks = nextCallbacks
    Object.assign(stage.dataset, previousData)
    stage.dataset.entranceMode = 'simple'
    stage.dataset.entranceFinished = 'false'
    stage.dataset.entrancePhase = 'waiting-route'
    stage.style.opacity = '0'
    stage.appendChild(renderer.domElement)
    heroEntranceText = stage.querySelector<HTMLElement>('.temple-backdrop h1')
    if (heroEntranceText)
      gsap.set(heroEntranceText, { yPercent: 0, opacity: 1 })
    // 旧元素已释放；相同诊断值也应重新发布到本次页面。
    stageData.clear()
    readyNotified = false
    buttonStyles.clear()
    pointerBounds = undefined
    pointerBoundsDirty = projectionDirty = diagnosticsDirty = true
    sceneActive = true
    sceneOccluded = false
  }
  const resumeFromHost = async () => {
    const revision = ++hostRevision
    if (callbacks.entrySelection?.() === 'sprigatito')
      await ensurePetReference()
    if (disposed || revision !== hostRevision) return
    callbacks.prepared()
    await callbacks.waitForRouteEnter()
    if (disposed || revision !== hostRevision) return
    hosted = false
    const target = callbacks.entrySelection?.() ?? null
    if (target !== selected) select(target, true, true, true)
    else {
      callbacks.select(selected)
      callbacks.settled()
    }
    // select 会同步恢复默认视角和原有扫描/姿态；旧页面 DOM 的补间不参与复用。
    const title = stage.querySelector<HTMLElement>('.temple-backdrop')
    if (title)
      gsap.set(title, {
        opacity: selected === 'statue' ? 0 : selected ? 0.2 : 1,
        scale: selected === 'statue' ? 1 + STATUE_ENVIRONMENT_EXPANSION : 1,
      })
    themeTransition?.progress(1)
    transition?.kill()
    if (target) fadeIntoStage()
    else startEntrance(true)
    connectHostEvents()
    resize()
    staticSceneCache.invalidate()
    render(performance.now())
    renderer.domElement.style.visibility = 'visible'
    syncActivity()
  }

  return {
    canResumeFromHost,
    suspendForHost,
    retainedBytes,
    attachFromHost,
    resumeFromHost,
    get petId() {
      return currentPet.id
    },
    select,
    pick: click,
    resetPointer,
    setImmersive: (active: boolean) => {
      if (immersive === active) return
      immersive = active
      if (active) immersionStartedAt = performance.now()
      setStageData('immersive', String(active))
      resetPointer()
      immersionTween?.kill()
      // 正面碑文淡化时同步更新静态场景缓存。
      immersionTween = gsap.to(
        immersionLabelOpacity.map((entry) => entry.material),
        {
          opacity: (index: number) =>
            active ? 0 : immersionLabelOpacity[index].opacity,
          duration: reducedMotion ? 0 : 0.4,
          ease: 'power1.inOut',
          onUpdate: () => {
            staticSceneCache.invalidate()
            invalidate()
          },
        }
      )
    },
    setThemeColor,
    setColorMode: (mode: 'light' | 'dark') => {
      if (stage.dataset.colorMode === mode) return
      lightMode = mode === 'light'
      stage.dataset.colorMode = mode
      chromeMaterial.metalness = lightMode ? 0.72 : 1
      chromeMaterial.roughness = lightMode ? 0.22 : 0.09
      if (sprigatitoSurface) {
        sprigatitoSurface.metalness = chromeMaterial.metalness
        sprigatitoSurface.roughness = chromeMaterial.roughness
      }
      setThemeColor(stage.dataset.themeColor || experience.themeColor, false)
    },
    setPet,
    // 页面决定场景是否可见，场景统一管理动画时钟、指针订阅和绘制的暂停/恢复。
    setActive: (active: boolean) => {
      if (sceneActive === active) return
      sceneActive = active
      syncSkyClip()
      syncActivity()
    },
    // 遮挡暂停优先于入场动画，避免 About 打开时入场逻辑继续占用 GPU。
    setOccluded: (occluded: boolean) => {
      if (sceneOccluded === occluded) return
      sceneOccluded = occluded
      syncSkyClip()
      syncActivity()
    },
    dispose: () => {
      if (disposed) return
      hostRevision++
      referenceIntent++
      clearReferenceCursor()
      document.documentElement.style.removeProperty('--temple-sky-bottom')
      immersionTween?.kill()
      disposed = true
      labelLod?.dispose()
      shaderWarmup?.cancel()
      petChangeRevision++
      petEntrance?.kill()
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
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        invalidateHostContext
      )
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (dizzyFrameTimer !== undefined) clearTimeout(dizzyFrameTimer)
      renderer.domElement.remove()
      // Three 的并行编译轮询仍需读取 program；结束后再释放，避免快速离场时访问已销毁资源。
      if (preparation)
        void preparation.finally(releaseResources).catch(() => {})
      else releaseResources()
    },
  }
}
