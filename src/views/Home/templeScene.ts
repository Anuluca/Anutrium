import { gsap } from 'gsap'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {
  FLORA_LAYOUT_BOTTOM_GAP,
  FLORA_LAYOUT_GAP,
  FLORA_MOBILE_CHARACTER_HEIGHT_RATIO,
  FLORA_MOBILE_MODEL_HEIGHT_RATIO,
  FLORA_MODEL_CENTER_X,
} from '@/config/floraLayout'
import { templeCamera } from '@/config/templeCamera'
import {
  type TempleExperience,
  templeExperience,
} from '@/config/templeExperience'
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
import { getTempleLabelCanvas } from '@/utils/templeLabelTextures'

import {
  createObeliskBaseGeometry,
  createObeliskBodyGeometry,
} from './scene/geometry'
import { installEnvironmentFade, installHeadRig } from './scene/materials'
import {
  createPetFocusCamera,
  createPetScreenBounds,
} from './scene/petFocusCamera'

export type TempleSelection = TempleCategoryId | 'statue' | 'sprigatito'

interface TempleCallbacks {
  waitForRouteEnter: () => Promise<void>
  prepared: () => void
  progress: (value: number) => void
  ready: () => void
  entranceComplete: () => void
  beforeReturn: () => Promise<void> | undefined
  dismissBackground?: () => boolean
  select: (id: TempleSelection | null) => void
  settled: () => void
  error: (error: unknown) => void
}

const MAX_RENDER_PIXELS = 2048 * 2048
const DIAGNOSTIC_INTERVAL = 100
const SCENE_VERTICAL_OFFSET = templeCamera.verticalOffset
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
const STATUE_ENVIRONMENT_DURATION = 1.6
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
const STATUE_PREVIEW_VERTICAL_OFFSET = 0.12
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
  let currentPet = initialPet
  let petChangeRevision = 0
  let petFadingOut = false
  let petEntrance: gsap.core.Timeline | undefined
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
  const templeExpansion = { value: 1 }
  let returningStatue = false
  let hovered: TempleCategoryId | 'sprigatito' | null = null
  const lastPointer = new THREE.Vector2()
  let hasPointer = false
  let preparation: Promise<void> | undefined
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
        y: -SCENE_VERTICAL_OFFSET + 0.05,
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
        SCENE_VERTICAL_OFFSET,
    }
  }
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

  const bodyGeometry = geometry(createObeliskBodyGeometry())
  const capGeometry = geometry(new THREE.ConeGeometry(0.663, 1.05, 4))
  capGeometry.rotateY(Math.PI / 4)
  const baseGeometry = geometry(createObeliskBaseGeometry())
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

  const labelSubscriptions: (() => void)[] = []
  const labelTexture = (label: ReturnType<typeof getTempleLabelCanvas>) => {
    const map = texture(new THREE.CanvasTexture(label.canvas))
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    labelSubscriptions.push(
      label.subscribe(() => {
        if (!disposed) {
          map.needsUpdate = true
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
    group.add(new THREE.Mesh(baseGeometry, baseMaterial))
    if (isTempleWireframeModel(category.id)) {
      applyModelWireframe(body, surface)
      applyModelWireframe(cap, crystal)
      for (const foot of [...group.children])
        if (foot instanceof THREE.Mesh) applyModelWireframe(foot, baseMaterial)
      core.visible = false
      capLines.visible = false
    }
    const labelAccent = { value: new THREE.Color('#f52e5b') }
    const labelMaterial = material(
      new THREE.MeshBasicMaterial({
        map: labelTexture(getTempleLabelCanvas(category.roman, category.title)),
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
        gl_FragColor=vec4(floorColor,mix(0.97,0.58,distanceFade));
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
  scene.add(sprigatitoSpot, sprigatitoSpot.target)
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

  // 倒影共用几何体，仅增加镜像绘制；聚焦直接绘制场景，不增加离屏或模糊通道。
  const reflectionMaterials: {
    source: THREE.MeshStandardMaterial
    copy: THREE.MeshStandardMaterial
  }[] = []
  const reflectionColors: { source: THREE.Color; copy: THREE.Color }[] = []
  const mirror = (source: THREE.Object3D, opacity: number) => {
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
      const faded = material(original.clone())
      mirroredMaterials.set(original, faded)
      faded.transparent = true
      faded.opacity = opacity
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
  const statueLabelReveal = { value: config.id === 'mobile' ? 1 : 0 }
  const statueLabelFocus = { value: 0 }
  let statueLabelTarget = statueLabelReveal.value
  let statueLabelMotionStart = statueLabelReveal.value
  let statueLabelMotionTime = 0
  const syncStatueLabelTarget = (now: number) => {
    const target =
      config.id === 'mobile' ||
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
  let themeTintRevision = 0
  let themeTransition: gsap.core.Tween | undefined
  const applyThemeTint = () => {
    themeTintRevision++
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
      // 字样使用当前主题的完整色值，模型与环境保留各自的明暗层次。
      if (item.color === statueLabelMaterial.color) item.target.copy(themeColor)
      else
        item.target.setHSL(
          item.h + hsl.h - themeOrigin.h,
          Math.min(1, (item.s * hsl.s) / themeOrigin.s),
          item.l
        )
    }
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
          paused: !sceneActive || document.hidden,
          onUpdate: applyThemeTint,
        }
      )
  }
  let updateSceneMatrices: (() => boolean) | undefined
  const drawScene = () => {
    updateSceneMatrices?.()
    // 相机在构图变化时已更新；渲染器不再重复计算同一帧的相机矩阵。
    camera.matrixWorldAutoUpdate = false
    try {
      renderer.render(scene, camera)
    } finally {
      camera.matrixWorldAutoUpdate = true
    }
  }
  const environmentHover = { value: 0 }
  const appearance = {
    themeRevision: -1,
    brightness: NaN,
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
      flatShading: true,
      clearcoat: 0.45,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
      transparent: true,
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

  const installTempleFade = () => {
    const excluded = new Set<THREE.Material>([
      chromeMaterial,
      wireMaterial,
      wireDepthMaterial,
      statueLabelMaterial,
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
    installEnvironmentFade(
      materials,
      excluded,
      unexpanded,
      templeReveal,
      templeExpansion
    )
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
        0.25 * (1 - sprigatitoWireMix) * petVisibility.value
    }
    if (reflectedSprigatitoWire) {
      reflectedSprigatitoWire.visible = sprigatitoWireMix > 0
      reflectedSprigatitoWire.material.opacity =
        0.25 * sprigatitoWireMix * petVisibility.value
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
    pedestal.visible = environmentVisible
    sleepingSprigatito.visible = environmentVisible
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
      petHeadMoving ||
      (followHead && headCurrent.distanceToSquared(headTarget) > 0.000001)
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
    const holyScale = 0.08 + templeReveal.value * 0.92
    statueHolyLight.scale.set(
      (1 + statueHover.value * 0.3) * holyScale,
      (1 + statueHover.value * 0.08) * holyScale,
      1
    )
    const environmentHoverTarget =
      hovered || focusedObelisk || selected === 'sprigatito' ? 1 : 0
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
    const environmentAppearanceChanged =
      appearance.brightness !== environmentBrightness ||
      appearance.themeRevision !== themeTintRevision
    let reflectionAppearanceChanged = environmentAppearanceChanged
    // 每帧从主题缓动的基色恢复，再叠加悬停；退出 hover 不会留下颜色或亮度残值。
    if (environmentAppearanceChanged) {
      for (const entry of tintTargets) {
        entry.color.copy(entry.current)
        // 常态字样保持当前主题色，不参与聚焦时的背景压暗。
        if (entry.color !== statueLabelMaterial.color)
          entry.color.multiplyScalar(environmentBrightness)
      }
      ambient.intensity = 0.65 * environmentBrightness
      key.intensity = 1.6 * environmentBrightness
      rim.intensity = 2.8 * environmentBrightness
      statueLight.intensity = 42 * environmentBrightness
    }
    if (
      environmentAppearanceChanged ||
      appearance.statueHover !== statueHover.value
    ) {
      chromeMaterial.envMapIntensity =
        (1.8 + statueHover.value * 0.8) * environmentBrightness
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
          1 - (environmentHover.value - sprigatitoHover.value) * 0.58
        )
      surface.envMapIntensity = 1.8 + sprigatitoHover.value * 0.8
      surface.clearcoat = 0.45 + sprigatitoHover.value * 0.25
      reflectionAppearanceChanged = true
    }
    const initialSprigatitoHover =
      (!selected || selected === 'sprigatito') && !entranceActive
        ? sprigatitoHover.value
        : 0
    const sprigatitoIllumination =
      Math.max(sprigatitoFocus.value, initialSprigatitoHover) * 0.5
    statueHolyLight.material.uniforms.intensity.value =
      statueHolyIntensity.value * (1 - sprigatitoHover.value)
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
        obeliskAppearance[hoverIndex] === item.hoverStrength &&
        obeliskAppearance[hoverIndex + 1] === item.strength
      )
        continue
      obeliskAppearance[hoverIndex] = item.hoverStrength
      obeliskAppearance[hoverIndex + 1] = item.strength
      reflectionAppearanceChanged = true
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
    }
    if (reflectionAppearanceChanged) {
      for (const { source, copy } of reflectionMaterials) {
        copy.color.copy(source.color)
        copy.emissive.copy(source.emissive)
        copy.emissiveIntensity = source.emissiveIntensity
        copy.envMapIntensity = source.envMapIntensity
      }
      for (const entry of reflectionColors) entry.copy.copy(entry.source)
    }
    appearance.themeRevision = themeTintRevision
    appearance.brightness = environmentBrightness
    appearance.statueHover = statueHover.value
    appearance.sprigatitoHover = sprigatitoHover.value
    appearance.sprigatitoFocus = sprigatitoFocus.value
    // 诊断属性不参与视觉绘制；限频发布，关键状态与静止末帧立即同步。
    const publishDiagnostics =
      diagnosticsDirty ||
      now - lastDiagnosticAt >= DIAGNOSTIC_INTERVAL ||
      !(moving || transitionActive || hoverMoving)
    if (publishDiagnostics) {
      lastDiagnosticAt = now
      diagnosticsDirty = false
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
      projectionDirty = false
    }
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
  const petFocusCamera = createPetFocusCamera()
  const petScreenBounds = createPetScreenBounds()
  let floraReferenceModel: FloraPetModelAsset | undefined
  let currentPetAssetFacing: number[] | undefined
  const selectedPose = () => {
    if (selected === 'statue') return fullStatuePose()
    if (selected === 'sprigatito') {
      return petFocusCamera({
        geometry: sprigatitoMesh!.geometry,
        reference: floraReferenceModel,
        camera,
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
  const startEntrance = () => {
    if (simpleEntrance) {
      if (heroEntranceText)
        gsap.set(heroEntranceText, { yPercent: 0, opacity: 1 })
      statueHolyIntensity.value = 1
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
            callbacks.entranceComplete()
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
      statueHolyIntensity.value = 1
      entranceHeadDip.value = headNodDegrees
      setStageData('entranceFinished', 'true')
      setStageData('entrancePhase', 'complete')
      callbacks.ready()
      callbacks.entranceComplete()
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
        callbacks.entranceComplete()
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
    motionStart = performance.now()
    if (document.hidden || !sceneActive) pausedAt = motionStart
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
    if (
      id &&
      id !== 'statue' &&
      id !== 'sprigatito' &&
      !obeliskById.get(id)?.category.enabled
    )
      return
    const next = selected === id ? null : id
    if (next === selected) return
    if (menuExitPending && !next && !menuExited) return
    const revision = ++selectionRevision
    const wasStatue = selected === 'statue'
    const wasSprigatito = selected === 'sprigatito'
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
    const duration = reducedMotion || immediate ? 0.01 : 1.65
    const returnDelay = returningStatue && !reducedMotion ? 0.4 : 0
    const statueTransition = selected === 'statue' || wasStatue
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
      selected === 'sprigatito'
        ? returnDelay + duration * 0.75
        : wasSprigatito
        ? returnDelay + duration
        : 0
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
      returnDelay + duration
    )
    tweenIfChanged(
      entranceHeadDip,
      {
        value: item ? 0 : headNodDegrees,
        duration: item || wasPillar ? duration * 2 : duration,
        ease: 'power2.inOut',
      },
      0
    )
    if (returningStatue) {
      tweenIfChanged(
        headCurrent,
        {
          x: 0,
          y: 0,
          duration: returnDelay || duration,
          ease: 'power2.inOut',
        },
        0
      )
      tweenIfChanged(
        entranceHeadDip,
        {
          value: headNodDegrees,
          duration: returnDelay || duration,
          ease: 'power2.inOut',
        },
        0
      )
      tweenIfChanged(
        statue.rotation,
        { y: 0, z: 0, duration: returnDelay || duration, ease: 'power2.inOut' },
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
      returnDelay
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
      returnDelay
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
        returnDelay
      )
    const pose = selectedPose()
    tweenIfChanged(
      statueView,
      { mix: selected === 'statue' ? 1 : 0, duration, ease: 'power2.inOut' },
      returnDelay
    )
    // 保留当前裁切面作为起点，跟随模型升降逐步释放下半身；中途反向也不会跳变。
    tweenIfChanged(
      statueClipPlane,
      {
        constant: selected === 'statue' ? 0.1 : -0.52,
        duration,
        ease: 'power3.inOut',
      },
      returnDelay
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
        onUpdate: applyViewOffset,
      },
      returnDelay
    )
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
        returnDelay
      )
    } else
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
        returnDelay
      )
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
      returnDelay
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
      returnDelay
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
        returnDelay
      )
      tweenIfChanged(
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
        selected !== 'statue' &&
          selected !== 'sprigatito' &&
          (!item || obelisk === item)
          ? 0
          : -OBELISK_ENTRANCE_DEPTH,
        statueTransition ? environmentDuration : duration,
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
      petEntrance?.pause()
      unsubscribe?.()
      unsubscribe = undefined
      if (frame !== undefined) cancelAnimationFrame(frame)
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
    // 固定子网格只烘焙一次局部矩阵；父组运镜仍照常更新世界矩阵和倒影。
    const movingTransforms = new Set<THREE.Object3D>([
      ground,
      pedestal,
      reflectedPedestal,
      statue,
      reflectedStatue!,
      sleepingSprigatito,
      reflectedSprigatito!,
      sprigatitoBeam,
      sprigatitoPool,
      sprigatitoSpot,
      sprigatitoSpot.target,
      statueGlow,
      statueLight,
      statueHolyLight,
      statueLabel,
      ...reflectedObelisks,
      ...reflectedShafts,
      ...obelisks.flatMap((item) => [
        item.group,
        item.shaft,
        item.capHalo,
        item.spot,
        item.spot.target,
      ]),
    ])
    updateSceneMatrices = createSceneMatrixUpdater(scene, movingTransforms)
    updateSceneMatrices()
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
    setStageData('companionVisibility', petVisibility.value.toFixed(3))
    stage.dataset.companion = currentPet.model
    stage.dataset.petId = currentPet.id
    stage.dataset.companionPose =
      currentPet.model === 'sprigatito' && sprigatitoPose.value === 0
        ? 'sleep'
        : currentPet.pose
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
        sprigatitoMesh!.geometry.userData.sleepMinY * sleepingSprigatito.scale.x
    )
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
          onUpdate: applyViewOffset,
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
    delete stage.dataset.companionScreenBounds
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
    labelSubscriptions.forEach((unsubscribe) => unsubscribe())
    geometries.forEach((value) => value.dispose())
    materials.forEach((value) => value.dispose())
    textures.forEach((value) => value.dispose())
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
          currentPet.model === 'sprigatito'
            ? sleepingModel
            : await loadFloraPetModel('sprigatito')
        if (disposed) return
        callbacks.progress(60)
        for (const name of [
          'position',
          'normal',
          'statueLabelCharacter',
        ] as const) {
          const attribute = labelModel.metadata.attributes[name]
          statueLabelGeometry.setAttribute(
            name,
            new THREE.BufferAttribute(
              new Float32Array(
                labelModel.buffer,
                attribute.offset,
                attribute.count
              ),
              name === 'statueLabelCharacter' ? 1 : 3
            )
          )
        }
        const labelIndices = labelModel.metadata.attributes.indices
        statueLabelGeometry.setIndex(
          new THREE.BufferAttribute(
            new Uint16Array(
              labelModel.buffer,
              labelIndices.offset,
              labelIndices.count
            ),
            1
          )
        )
        statueLabelHalfHeight = labelModel.metadata.halfHeight
        statueLabelDepth = labelModel.metadata.depth
        statueLabel.position.y = 0.52 + statueLabelHalfHeight
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
        reflectedSprigatito = mirror(sleepingSprigatito, 0.25)
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
        stage.dataset.wireframeObelisks = obelisks
          .filter((item) => isTempleWireframeModel(item.category.id))
          .map((item) => item.category.id)
          .join(',')
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
        cacheMorphRaycastVertices(mesh)
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
        installTempleFade()
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
        ready = true
        startEntrance()
        render(performance.now())
        renderer.domElement.style.visibility = 'visible'
        syncActivity()
      }
    )
    .catch((error) => {
      if (!disposed) callbacks.error(error)
    })

  return {
    select,
    pick: click,
    setThemeColor,
    setPet,
    // 页面决定场景是否可见，场景统一管理动画时钟、指针订阅和绘制的暂停/恢复。
    setActive: (active: boolean) => {
      if (sceneActive === active) return
      sceneActive = active
      syncActivity()
    },
    dispose: () => {
      disposed = true
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
      if (frame !== undefined) cancelAnimationFrame(frame)
      renderer.domElement.remove()
      // Three 的并行编译轮询仍需读取 program；结束后再释放，避免快速离场时访问已销毁资源。
      if (preparation)
        void preparation.finally(releaseResources).catch(() => {})
      else releaseResources()
    },
  }
}
