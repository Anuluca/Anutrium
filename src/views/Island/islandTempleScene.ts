import { gsap } from 'gsap'
import * as THREE from 'three'

import { cursorState } from '@/stores'
import { loadIslandLucarioModel } from '@/utils/islandLucarioModel'
import { subscribePointerSamples } from '@/utils/pointerSamples'

import { templeCategories, type TempleCategoryId } from './templeCategories'

export type TempleSelection = TempleCategoryId | 'statue'

interface TempleCallbacks {
  waitForRouteEnter: () => Promise<void>
  completeProgress: () => Promise<void>
  progress: (value: number | null) => void
  ready: () => void
  select: (id: TempleSelection | null) => void
  settled: () => void
  error: (error: unknown) => void
}

const MAX_RENDER_PIXELS = 2048 * 2048
const SCENE_VERTICAL_OFFSET = 0.0125
const FOCUS_SCREEN_OFFSET = 0.05
const INNER_OBELISK_ADVANCE = 3
const INNER_STATUE_RETREAT = 5
const OBELISK_SCALE = new THREE.Vector3(1.28, 1.22, 1.28)
const ENTRANCE_SPEED = 1.2
const ENTRANCE_DURATION = 6.8 / ENTRANCE_SPEED
const ENTRANCE_PLAYBACK_RATE = 1.2
const ENTRANCE_DELAY = 1.2
const INNER_PILLAR_ENTRANCE_DELAY = 1.1 / ENTRANCE_SPEED
const OUTER_PILLAR_ENTRANCE_DELAY = 1.55 / ENTRANCE_SPEED
const PILLAR_ENTRANCE_DURATION = 3.2
const FOCUS_LOOK_UP_DEGREES = 10
const OBELISK_ENTRANCE_DEPTH = 7.5
const OBELISK_BASE_TOP = 0.34
const HOLY_LIGHT_COLOR = '#E23455'
const HEAD_NOD_DEGREES = 10
const NECK_EXTENSION = 0.035

export function createIslandTemple(
  stage: HTMLElement,
  buttons: Map<string, HTMLElement>,
  callbacks: TempleCallbacks
) {
  const cursorStateStore = cursorState()
  const statueCursorSource = 'island-statue'
  const syncStatueCursor = (
    hit: TempleSelection | undefined,
    target: EventTarget | null
  ) => {
    cursorStateStore.setInteractive(
      statueCursorSource,
      !entranceActive && hit === 'statue' && target === renderer.domElement
    )
  }
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.localClippingEnabled = true
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute(
    'aria-label',
    '头部跟随指针的路卡利欧三维模型'
  )
  stage.appendChild(renderer.domElement)
  renderer.domElement.style.visibility = 'hidden'
  stage.style.opacity = '0'
  // 只移动标题内层，沿用现有裁切容器，让文字从地平线下方升起；外层继续贴合地平线。
  const heroEntranceText = stage.querySelector<HTMLElement>(
    '.page-hero-title h1'
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
  let frame: number | undefined
  let lastDraw = 0
  let selected: TempleSelection | null = null
  let transition: gsap.core.Timeline | undefined
  let transitionActive = false
  let entranceActive = false
  let entranceDelay: gsap.core.Tween | undefined
  const entranceHeadDip = { value: 0 }
  let motionStart = 0
  let hiddenAt = 0
  let hovered: TempleCategoryId | null = null
  const lastPointer = new THREE.Vector2()
  let hasPointer = false
  let preparation: Promise<void> | undefined
  let projectionDirty = true
  let viewWidth = 0
  let viewHeight = 0
  const focusFraming = { x: 0 }
  const applyViewOffset = () => {
    if (!viewWidth || !viewHeight) return
    // 调整相机投影，让雕像、碑身、圣光和倒影整体让出菜单空间；点击投影使用同一相机。
    camera.setViewOffset(
      viewWidth,
      viewHeight,
      -viewWidth * focusFraming.x,
      -viewHeight * SCENE_VERTICAL_OFFSET,
      viewWidth,
      viewHeight
    )
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

  const monuments = new THREE.Group()
  scene.add(monuments)
  const reflection = new THREE.Group()
  reflection.scale.y = -1
  scene.add(reflection)
  scene.add(new THREE.AmbientLight(0xb45d71, 0.65))
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
  gradient.addColorStop(0, 'rgba(255,35,81,0.7)')
  gradient.addColorStop(0.22, 'rgba(199,9,49,0.3)')
  gradient.addColorStop(1, 'rgba(120,0,22,0)')
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
  const obelisks = templeCategories.map((category) => {
    const group = new THREE.Group()
    group.position.set(category.x, 0, category.z)
    const inwardAngle = category.z > 0 ? 40 : 24
    group.rotation.y =
      -Math.sign(category.x) * THREE.MathUtils.degToRad(inwardAngle)
    group.scale.copy(OBELISK_SCALE)
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
    for (const [shape, y] of [
      [stepGeometry, 0.065],
      [footGeometry, 0.235],
    ] as const) {
      const foot = new THREE.Mesh(shape, plinthMaterial)
      foot.position.y = y
      group.add(foot)
    }
    const labelMaterial = material(
      new THREE.MeshBasicMaterial({
        map: labelTexture(category.roman, category.title),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    )
    const label = new THREE.Mesh(labelGeometry, labelMaterial)
    // 正面随碑身收分倾斜，文字与石材保持同一个透视平面。
    label.position.set(0, body.position.y, 0.565)
    label.rotation.x = -Math.atan(0.182 / 4.55)
    shaft.add(label)
    const glowMaterial = material(
      new THREE.MeshBasicMaterial({
        map: glowMap,
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
      crystal,
      core,
      edge,
      capHalo,
      capHaloMaterial,
      labelMaterial,
      glowMaterial,
      beamMaterial,
      beam,
      poolMaterial,
      pool,
      spot,
      strength: 0,
      hoverStrength: 0,
    }
  })

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
        fragmentShader: `varying vec3 world;varying float floorDepth;void main(){
        float sheen=0.5+0.5*sin(world.z*4.+sin(world.x*1.5)*0.25);
        float distanceFade=smoothstep(3.,18.,floorDepth);
        vec3 floorColor=mix(vec3(0.0003,0.00005,0.0001),vec3(0.023+sheen*0.006,0.003,0.008),distanceFade);
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
  const drawScene = () => renderer.render(scene, camera)
  const headRotation = { value: new THREE.Vector4(0, 0, 0, 1) }
  const headPivot = { value: new THREE.Vector3() }
  const headNodPivot = { value: new THREE.Vector3() }
  const headNodAngle = { value: 0 }
  const headCurrent = new THREE.Vector2()
  const headTarget = new THREE.Vector2()
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
  // DOM 仅提供与投影轮廓吻合的无障碍点击区域，不参与建筑的绘制或缩放。
  const projectButtons = () => {
    const width = viewWidth
    const height = viewHeight
    for (const item of obelisks) {
      const button = buttons.get(item.category.id)
      if (!button) continue
      if (
        entranceActive ||
        !item.shaft.visible ||
        (selected && item.category.id !== selected)
      ) {
        button.style.visibility = 'hidden'
        button.tabIndex = -1
        button.setAttribute('aria-hidden', 'true')
        continue
      }
      button.tabIndex = 0
      button.removeAttribute('aria-hidden')
      const points = hitPoints.map(([x, y, z]) => {
        screenPoint
          .set(x, y, z)
          .applyMatrix4(item.shaft.matrixWorld)
          .project(camera)
        return {
          x: (screenPoint.x * 0.5 + 0.5) * width,
          y: (-screenPoint.y * 0.5 + 0.5) * height,
        }
      })
      const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
      const cross = (
        o: (typeof points)[0],
        a: (typeof points)[0],
        b: (typeof points)[0]
      ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
      const hull: typeof points = []
      for (const point of sorted) {
        while (
          hull.length >= 2 &&
          cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0
        )
          hull.pop()
        hull.push(point)
      }
      const lower = hull.length
      for (const point of sorted.reverse().slice(1)) {
        while (
          hull.length > lower &&
          cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0
        )
          hull.pop()
        hull.push(point)
      }
      const minX = Math.min(...points.map((point) => point.x))
      const minY = Math.min(...points.map((point) => point.y))
      const w = Math.max(...points.map((point) => point.x)) - minX
      const h = Math.max(...points.map((point) => point.y)) - minY
      Object.assign(button.style, {
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${w}px`,
        height: `${h}px`,
        clipPath: `polygon(${hull
          .map(
            (point) =>
              `${((point.x - minX) / w) * 100}% ${
                ((point.y - minY) / h) * 100
              }%`
          )
          .join(',')})`,
        visibility: 'visible',
        zIndex: String(
          Math.round(100 - camera.position.distanceTo(item.group.position))
        ),
      })
    }
  }

  const canRender = () =>
    ready && !disposed && !document.hidden && stage.isConnected
  const render = (now: number) => {
    frame = undefined
    if (!canRender()) return
    if (now - lastDraw < 1000 / 60 - 0.1) {
      invalidate()
      return
    }
    const elapsed = Math.min((now - lastDraw) / 1000, 0.1)
    lastDraw = now
    const sceneChanged = projectionDirty || transitionActive
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
    const statueOnly = selected === 'statue'
    monuments.visible = !statueOnly
    ground.visible = !statueOnly
    reflection.visible = !statueOnly
    pedestal.visible = !statueOnly
    statueGlow.visible = !statueOnly
    chromeMaterial.opacity = 1 - statueView.mix
    wireMaterial.opacity = statueView.mix
    if (statueMesh) statueMesh.visible = statueView.mix < 1
    if (statueWire) statueWire.visible = statueView.mix > 0
    if (!selected && !entranceActive)
      headCurrent.lerp(headTarget, 1 - Math.exp(-elapsed * 18))
    const moving =
      !selected &&
      !entranceActive &&
      headCurrent.distanceToSquared(headTarget) > 0.000001
    if (!moving && !selected && !entranceActive) headCurrent.copy(headTarget)
    headAngles.set(
      THREE.MathUtils.degToRad(7 + headCurrent.y * 14),
      THREE.MathUtils.degToRad(headCurrent.x * 28),
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
    }
    if (sceneChanged) {
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
    // 运镜期间重新检测静止指针，确保悬停与实际投影一致。
    if (hasPointer && sceneChanged) {
      const hit = raycast(
        { clientX: lastPointer.x, clientY: lastPointer.y },
        true
      )
      hovered = hit === 'statue' ? null : hit || null
      syncStatueCursor(
        hit,
        document.elementFromPoint(lastPointer.x, lastPointer.y)
      )
    }
    statueHolyLight.visible =
      !statueOnly && statueHolyLight.material.uniforms.intensity.value > 0
    let hoverMoving = false
    for (const item of obelisks) {
      const hoverTarget = hovered === item.category.id ? 1 : 0
      item.hoverStrength = THREE.MathUtils.damp(
        item.hoverStrength,
        hoverTarget,
        8,
        elapsed
      )
      if (Math.abs(item.hoverStrength - hoverTarget) > 0.001) hoverMoving = true
      else item.hoverStrength = hoverTarget
      item.surface.envMapIntensity = 0.55
      item.crystal.envMapIntensity = 0.65
      // 降低均匀自发光，让各切面的漫反射与高光差异在圣光下仍可辨认。
      item.surface.emissiveIntensity = 0.025 + item.strength * 0.045
      item.surface.color.setHex(0x5a192d)
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
      item.labelMaterial.color.setScalar(1)
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
      copy.emissiveIntensity = source.emissiveIntensity
      copy.envMapIntensity = source.envMapIntensity
    }
    setStageData('statueZ', String(statue.position.z))
    setStageData('statueY', statue.position.y.toFixed(4))
    setStageData('statueFullY', statueFullY.toFixed(4))
    setStageData('materialPhase', statueView.mix === 1 ? 'wireframe' : 'chrome')
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
    setStageData(
      'capGlow',
      obelisks
        .map((item) => item.crystal.emissiveIntensity.toFixed(3))
        .join(',')
    )
    setStageData(
      'capHalo',
      obelisks.map((item) => item.capHaloMaterial.opacity.toFixed(3)).join(',')
    )
    setStageData(
      'topLight',
      obelisks
        .map((item) => item.beamMaterial.uniforms.intensity.value.toFixed(3))
        .join(',')
    )
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
    if (moving || transitionActive || hoverMoving) invalidate()
  }
  function invalidate() {
    if (frame === undefined && canRender())
      frame = requestAnimationFrame(render)
  }
  const focusPose = (category: (typeof templeCategories)[number]) => {
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
      (category.z > 0 ? 0.6 : 0.5) *
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
      Math.max(statueSize.y, statueSize.x / camera.aspect) /
        (2 * halfFov * 0.8) +
      statueSize.z / 2
    const target = new THREE.Vector3(0, statueSize.y / 2, statueZ)
    return {
      position: target.clone().add(new THREE.Vector3(0, 0, distance)),
      target,
    }
  }
  const selectedPose = () => {
    if (selected === 'statue') return fullStatuePose()
    const item = obelisks.find((item) => item.category.id === selected)
    return item
      ? focusPose(item.category)
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
    if (reducedMotion) {
      stage.style.opacity = '1'
      if (heroEntranceText)
        gsap.set(heroEntranceText, { yPercent: 0, opacity: 1 })
      statueHolyLight.material.uniforms.intensity.value = 1
      entranceHeadDip.value = HEAD_NOD_DEGREES
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
    // 圣光覆盖完整的柱子入场时间段，共用时间轴与播放速率，避免先亮后升或单独补动画。
    transition.to(
      statueHolyLight.material.uniforms.intensity,
      {
        value: 1,
        duration:
          OUTER_PILLAR_ENTRANCE_DELAY +
          PILLAR_ENTRANCE_DURATION -
          INNER_PILLAR_ENTRANCE_DELAY,
        ease: 'sine.inOut',
      },
      INNER_PILLAR_ENTRANCE_DELAY
    )
    transition.to(
      entranceHeadDip,
      {
        value: HEAD_NOD_DEGREES,
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
    if (document.hidden) hiddenAt = motionStart
  }
  const resize = () => {
    viewWidth = stage.clientWidth
    viewHeight = stage.clientHeight
    if (!viewWidth || !viewHeight) return
    const baseRatio = Math.min(devicePixelRatio || 1, 1.5)
    // 预算只限制 3D 画布，大屏不按 DPR 的平方无限放大；DOM 菜单保持原生清晰度。
    const ratio = Math.min(
      baseRatio,
      Math.sqrt(MAX_RENDER_PIXELS / (viewWidth * viewHeight))
    )
    renderer.setPixelRatio(ratio)
    renderer.setSize(viewWidth, viewHeight, false)
    camera.aspect = viewWidth / viewHeight
    // 偏移投影而非页面容器，场景、倒影和投影点击区域一起下移，导航及离场几何保持原位。
    applyViewOffset()
    homePosition.z = Math.max(17.5, 31 / camera.aspect)
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
    setStageData('renderPixelRatio', String(ratio))
    invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(stage)
  resize()

  const select = (id: TempleSelection | null) => {
    if (!ready || disposed || entranceActive) return
    const next = selected === id ? null : id
    if (next === selected) return
    // 聚焦时保留最后实际绘制的姿势；退出后向最新指针位置平滑恢复跟随。
    if (!selected && next) headTarget.copy(headCurrent)
    selected = next
    if (!selected) headTarget.copy(pointerTarget)
    callbacks.select(selected)
    transition?.kill()
    const item = obelisks.find((obelisk) => obelisk.category.id === selected)
    const duration = reducedMotion ? 0.01 : 1.65
    transitionActive = true
    motionStart = performance.now()
    transition = gsap.timeline({
      paused: true,
      onUpdate: invalidate,
      onComplete: () => {
        transitionActive = false
        const pose = selectedPose()
        camera.position.copy(pose.position)
        lookAt.copy(pose.target)
        callbacks.settled()
        invalidate()
      },
    })
    const heroTitle = stage.querySelector<HTMLElement>('.page-hero-title')
    transition.to(
      statueHolyLight.material.uniforms.intensity,
      {
        value: selected ? 0 : 1,
        duration: Math.min(0.45, duration),
        ease: 'power2.out',
      },
      0
    )
    if (heroTitle)
      transition.to(
        heroTitle,
        {
          opacity: selected ? 0.2 : 1,
          duration: duration * 0.65,
          ease: 'power2.out',
        },
        0
      )
    const pose = selectedPose()
    transition.to(
      statueView,
      { mix: selected === 'statue' ? 1 : 0, duration, ease: 'power2.inOut' },
      0
    )
    transition.to(
      statueClipPlane,
      {
        constant: selected === 'statue' ? 0.1 : -0.52,
        duration,
        ease: 'power3.inOut',
      },
      0
    )
    transition.to(
      focusFraming,
      {
        x: item ? Math.sign(item.category.x) * FOCUS_SCREEN_OFFSET : 0,
        duration,
        ease: 'power3.inOut',
        onUpdate: applyViewOffset,
      },
      0
    )
    transition.to(
      camera.position,
      {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
        duration,
        ease: 'power3.inOut',
      },
      0
    )
    transition.to(
      lookAt,
      {
        x: pose.target.x,
        y: pose.target.y,
        z: pose.target.z,
        duration,
        ease: 'power3.inOut',
      },
      0
    )
    transition.to(
      statue.position,
      {
        y: selected === 'statue' ? statueFullY : statueHalfY,
        z: statueZ - (item && item.category.z < 0 ? INNER_STATUE_RETREAT : 0),
        duration,
        ease: 'power3.inOut',
      },
      0
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
        },
        0
      )
      transition.to(
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
        !item || obelisk === item ? 0 : -OBELISK_ENTRANCE_DEPTH,
        duration
      )
    }
    invalidate()
  }
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const hitObjects = obelisks.flatMap((item) => [item.body, item.cap])
  const intersections: THREE.Intersection[] = []
  const visibleHitObjects: THREE.Object3D[] = []
  const raycast = (
    event: Pick<MouseEvent, 'clientX' | 'clientY'>,
    includeStatue = false
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
      for (const object of hitObjects) {
        if (object.parent?.visible) visibleHitObjects.push(object)
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
    if (event.key === 'Escape' && selected === 'statue') select(null)
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
    pointerTarget
      .set(
        (event.clientX / innerWidth - 0.5) * 2,
        (event.clientY / innerHeight - 0.5) * 2
      )
      .clampScalar(-1, 1)
    const hit = raycast(event, true)
    syncStatueCursor(hit, event.target)
    const nextHover = hit === 'statue' ? null : hit || null
    const hoverChanged = hovered !== nextHover
    hovered = nextHover
    if (!selected && !entranceActive) headTarget.copy(pointerTarget)
    if (!selected || hoverChanged) invalidate()
  }
  let unsubscribe: (() => void) | undefined
  const syncActivity = () => {
    if (document.hidden) {
      cursorStateStore.setInteractive(statueCursorSource, false)
      entranceDelay?.pause()
      unsubscribe?.()
      unsubscribe = undefined
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = undefined
      hiddenAt = performance.now()
    } else {
      entranceDelay?.resume()
      if (ready && !unsubscribe)
        unsubscribe = subscribePointerSamples(follow, 1000 / 30)
      if (hiddenAt && transitionActive)
        motionStart += performance.now() - hiddenAt
      hiddenAt = 0
      invalidate()
    }
  }
  document.addEventListener('visibilitychange', syncActivity)
  const resetPointer = () => {
    hasPointer = false
    pointerTarget.set(0, 0)
    if (!selected) headTarget.copy(pointerTarget)
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

  loadIslandLucarioModel()
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
            source === 'positions' ? values.slice() : values,
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
          positions.getY(index) + NECK_EXTENSION * headWeights.getX(index)
        )
      headNodPivot.value.y += NECK_EXTENSION
      const mesh = new THREE.Mesh(surface, chromeMaterial)
      mesh.position.fromArray(metadata.center).multiplyScalar(-1)
      // 半身模型在当前尺寸上放大 10%，裁切面仍与底座台面齐平。
      const cropY = 1.2
      const modelScale = (6.7 * 1.76) / metadata.size[1]
      statue.scale.setScalar(modelScale)
      statue.position.y = 0.52 - (cropY - metadata.center[1]) * modelScale
      statue.add(mesh)
      reflectedStatue = mirror(statue, 0.42)
      statueMesh = mesh
      surface.computeBoundingBox()
      const bounds = surface.boundingBox!
      bounds.getSize(statueSize).multiplyScalar(modelScale)
      statueHalfY = statue.position.y
      statueFullY = (metadata.center[1] - bounds.min.y) * modelScale
      statueWire = new THREE.Mesh(surface, wireMaterial)
      statueWire.position.copy(mesh.position)
      statueWire.renderOrder = 4
      statue.add(statueWire)
      for (const [name, value] of Object.entries(metadata.stats))
        stage.dataset[name] = String(value)
      stage.dataset.materialPhase = 'chrome'
      preparation = prepareRendering()
      await preparation
      if (disposed) return
      callbacks.progress(85)
      setStageData('entrancePhase', 'waiting-route')
      await callbacks.waitForRouteEnter()
      if (disposed) return
      const reveal = () => {
        if (disposed) return
        callbacks.progress(null)
        ready = true
        startEntrance()
        render(performance.now())
        renderer.domElement.style.visibility = 'visible'
        syncActivity()
      }
      if (reducedMotion) reveal()
      else {
        setStageData('entrancePhase', 'delay')
        const progress = { value: 90 }
        callbacks.progress(progress.value)
        entranceDelay = gsap.to(progress, {
          value: 100,
          duration: ENTRANCE_DELAY,
          ease: 'none',
          paused: document.hidden,
          onUpdate: () => callbacks.progress(Math.floor(progress.value)),
          onComplete: () => {
            entranceDelay = undefined
            setStageData('entrancePhase', 'loading-complete')
            void callbacks.completeProgress().then(reveal)
          },
        })
      }
    })
    .catch((error) => {
      if (!disposed) callbacks.error(error)
    })

  return {
    select,
    dispose: () => {
      disposed = true
      cursorStateStore.setInteractive(statueCursorSource, false)
      transition?.kill()
      entranceDelay?.kill()
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
