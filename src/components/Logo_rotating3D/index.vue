<template>
  <div
    ref="sceneContainer"
    class="scene-container"
    :class="[
      { 'is-transparent': transparent, 'is-bottom-anchored': bottomAnchor },
      `render-mode--${renderMode}`,
    ]"
  >
    <div ref="container" class="canvas-container" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  EdgesGeometry,
  FogExp2,
  Group,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import {
  cacheWebGLResource,
  deferWebGLResourceDisposal,
  takeCachedWebGLResource,
} from '@/utils/webglResourceCache'

const emit = defineEmits(['finished', 'anchor-change'])
const props = defineProps({
  interactive: {
    type: Boolean,
    default: true,
  },
  lowPower: {
    type: Boolean,
    default: false,
  },
  transparent: {
    type: Boolean,
    default: false,
  },
  bottomAnchor: {
    type: Boolean,
    default: false,
  },
  mobileHighResolution: {
    type: Boolean,
    default: false,
  },
  resourceCacheKey: {
    type: String,
    default: '',
  },
  renderMode: {
    type: String,
    default: 'material',
    validator: (value) => ['material', 'edges'].includes(value),
  },
  edgeColor: {
    type: String,
    default: '#E23456',
  },
  edgeWidth: {
    type: Number,
    default: 1,
    validator: (value) => Number.isFinite(value) && value > 0,
  },
  rotationSpeed: {
    type: String,
    default: 'fast',
    validator: (value) => ['slow', 'medium', 'fast'].includes(value),
  },
})

const container = ref(null)
const sceneContainer = ref(null)
let isStopping = false
let renderer, scene, camera, composer, controls
let crystal, cage
let animationId = null
let environmentMap = null
let resizeRafId = null
let resizeObserver = null
let isPageVisible = true
let isInViewport = true
let visibilityObserver = null
let lastFrameTime = null
let animateFrame = null
let stopStartTime = null
let stopStartRotation = null
let stopTargetRotation = null
let runtimeGeneration = 0
let isUnmounted = false
let initializationPromise = null
const ROTATION_SPEEDS = Object.freeze({
  slow: 0.2,
  medium: 0.36,
  fast: 0.6,
})
const STOP_DURATION = 350
const FRONT_ROTATION_OFFSET = Math.PI / 4
const FRONT_ROTATION_INTERVAL = Math.PI / 2
const START_ROTATION = FRONT_ROTATION_OFFSET + FRONT_ROTATION_INTERVAL / 2
const MOBILE_BREAKPOINT = 768
const RESOURCE_CACHE_TTL = 60_000
const CRYSTAL_RADIUS = 1.5
const CRYSTAL_CYLINDER_HEIGHT = 4
const CRYSTAL_CONE_HEIGHT = CRYSTAL_RADIUS * 1.3
const isEdgeRenderMode = () => props.renderMode === 'edges'
const getRotationSpeed = () =>
  ROTATION_SPEEDS[props.rotationSpeed] ?? ROTATION_SPEEDS.fast

const shouldUseMobileHighResolution = () =>
  props.mobileHighResolution && window.innerWidth <= MOBILE_BREAKPOINT

const getRendererPixelRatio = () => {
  if (!props.lowPower) return Math.min(window.devicePixelRatio || 1, 1.5)

  return shouldUseMobileHighResolution()
    ? Math.min(window.devicePixelRatio || 1, 1.5)
    : 0.75
}

const getResourceCacheKey = () => {
  if (!props.resourceCacheKey) return ''

  return [
    props.resourceCacheKey,
    props.interactive ? 'interactive' : 'static',
    props.lowPower ? 'low-power' : 'full-power',
    props.transparent ? 'transparent' : 'opaque',
    props.mobileHighResolution ? 'mobile-hires' : 'default-resolution',
    props.renderMode,
    ...(isEdgeRenderMode() ? ['batched-v1'] : []),
    ...(isEdgeRenderMode() ? [props.edgeColor.toLowerCase()] : []),
    ...(isEdgeRenderMode() ? [`${props.edgeWidth}px`] : []),
  ].join(':')
}

const canRender = () => isPageVisible && isInViewport

const getSceneSize = () => {
  const rect = sceneContainer.value?.getBoundingClientRect()

  return {
    width: Math.max(1, Math.round(rect?.width || window.innerWidth)),
    height: Math.max(1, Math.round(rect?.height || window.innerHeight)),
  }
}

const syncBottomAnchor = () => {
  if (!props.bottomAnchor || !crystal || !camera || !sceneContainer.value)
    return
  scene.updateMatrixWorld(true)
  camera.updateMatrixWorld()
  // 以晶体的真实下尖端投影定位，包含模型缩放与画布的 0.5 倍 CSS 缩放。
  const tip = new Vector3(
    0,
    -CRYSTAL_CYLINDER_HEIGHT / 2 - CRYSTAL_CONE_HEIGHT,
    0
  )
    .applyMatrix4(crystal.matrixWorld)
    .project(camera)
  const halfHeight = (Math.abs(tip.y) * getSceneSize().height) / 4
  sceneContainer.value.style.setProperty(
    '--crystal-half-height',
    `${halfHeight}px`
  )
  // 2D 接续图形复用此投影高度，避免贴底后因尺寸不同而产生中心偏移。
  emit('anchor-change', halfHeight * 2)
}

const assignResources = (resources) => {
  renderer = resources.renderer
  scene = resources.scene
  camera = resources.camera
  composer = resources.composer
  controls = resources.controls
  environmentMap = resources.environmentMap
  crystal = resources.crystal
  cage = resources.cage
}

const getResources = () => ({
  renderer,
  scene,
  camera,
  composer,
  controls,
  environmentMap,
  crystal,
  cage,
})

const clearResourceReferences = () => {
  renderer = null
  scene = null
  camera = null
  composer = null
  controls = null
  environmentMap = null
  crystal = null
  cage = null
  animateFrame = null
}

const initThree = async () => {
  const generation = ++runtimeGeneration
  const { width, height } = getSceneSize()
  const resourceCacheKey = getResourceCacheKey()
  const cachedResources = resourceCacheKey
    ? takeCachedWebGLResource(resourceCacheKey)
    : null
  const canReuseCachedResources =
    cachedResources && !cachedResources.renderer.getContext().isContextLost()

  if (canReuseCachedResources) {
    assignResources(cachedResources)
    camera.position.set(0, 0, 9)
    camera.lookAt(0, 0, 0)
    crystal.rotation.y = START_ROTATION
    cage.rotation.y = -(START_ROTATION - FRONT_ROTATION_OFFSET)
    renderer.setPixelRatio(getRendererPixelRatio())
    renderer.setSize(width, height)
    composer?.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    controls && (controls.enabled = props.interactive)
    container.value?.appendChild(renderer.domElement)
  } else {
    if (cachedResources) disposeResources(cachedResources)

    const useEdgeRendering = isEdgeRenderMode()
    // 入口线框不下载环境与辉光扩展；在创建资源前完成加载，离场可直接取消初始化。
    const [environmentModule, effects, controlsModule] = await Promise.all([
      useEdgeRendering
        ? null
        : import('three/examples/jsm/environments/RoomEnvironment.js'),
      !props.lowPower && !useEdgeRendering
        ? Promise.all([
            import('three/examples/jsm/postprocessing/EffectComposer.js'),
            import('three/examples/jsm/postprocessing/RenderPass.js'),
            import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          ])
        : null,
      props.interactive
        ? import('three/examples/jsm/controls/OrbitControls.js')
        : null,
    ])
    if (isUnmounted || generation !== runtimeGeneration) return
    scene = new Scene()
    scene.background = props.transparent ? null : new Color('#050505')
    if (!props.transparent && !useEdgeRendering) {
      scene.fog = new FogExp2(0x050505, 0.02)
    }

    camera = new PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 9)
    camera.lookAt(0, 0, 0)

    renderer = new WebGLRenderer({
      alpha: props.transparent,
      antialias:
        useEdgeRendering || !props.lowPower || props.mobileHighResolution,
      powerPreference: props.lowPower ? 'low-power' : 'high-performance',
    })
    renderer.setPixelRatio(getRendererPixelRatio())
    renderer.setSize(width, height)

    renderer.shadowMap.enabled = !props.lowPower && !useEdgeRendering
    renderer.shadowMap.type = PCFSoftShadowMap

    container.value?.appendChild(renderer.domElement)

    if (!useEdgeRendering) {
      const pmremGenerator = new PMREMGenerator(renderer)
      environmentMap = pmremGenerator.fromScene(
        new environmentModule.RoomEnvironment(),
        0.04
      )
      scene.environment = environmentMap.texture
      pmremGenerator.dispose()

      const ambientLight = new AmbientLight(0xffffff, 0.1)
      scene.add(ambientLight)

      const spotLight = new SpotLight(0xffffff, 50)
      spotLight.position.set(5, 10, 5)
      spotLight.angle = Math.PI / 4
      spotLight.penumbra = 0.5
      spotLight.castShadow = !props.lowPower
      spotLight.shadow.bias = -0.0001
      scene.add(spotLight)
    }

    if (!props.lowPower && !useEdgeRendering) {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = effects
      const renderScene = new RenderPass(scene, camera)
      const bloomPass = new UnrealBloomPass(
        new Vector2(width, height),
        1.5,
        0.4,
        0.85
      )
      bloomPass.threshold = 0.01
      bloomPass.strength = 0.4
      bloomPass.radius = 0.01

      composer = new EffectComposer(renderer)
      composer.addPass(renderScene)
      composer.addPass(bloomPass)
    }

    if (props.interactive) {
      controls = new controlsModule.OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
    }

    const edgeMaterial = useEdgeRendering
      ? new LineMaterial({
          color: props.edgeColor,
          linewidth: props.edgeWidth,
          toneMapped: false,
          worldUnits: false,
        })
      : null
    const cageMaterial = useEdgeRendering
      ? null
      : new MeshStandardMaterial({
          color: 'black',
          metalness: 0.5,
          roughness: 0.5,
          envMapIntensity: 0,
        })
    const crystalMaterial = useEdgeRendering
      ? null
      : new MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0.01,
          roughness: 0.01,
          transmission: 1,
          thickness: 2,
          ior: 1.5,
          reflectivity: 0.1,
          transparent: true,
        })

    const prepareGeometry = (geometry) => {
      if (!useEdgeRendering) return geometry

      const edgesGeometry = new EdgesGeometry(geometry)
      geometry.dispose()

      const lineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(
        edgesGeometry
      )
      edgesGeometry.dispose()
      return lineGeometry
    }
    const createRenderable = (geometry, material) => {
      if (useEdgeRendering) {
        return new LineSegments2(geometry, edgeMaterial)
      }

      return new Mesh(geometry, material)
    }

    const group = new Group()
    scene.add(group)

    const createCrystal = () => {
      const crystalGroup = new Group()
      const radius = CRYSTAL_RADIUS
      const cylinderHeight = CRYSTAL_CYLINDER_HEIGHT
      const coneHeight = CRYSTAL_CONE_HEIGHT
      const segments = 4

      const cylinderGeometry = prepareGeometry(
        new CylinderGeometry(radius, radius, cylinderHeight, segments)
      )
      const coneGeometry = prepareGeometry(
        new ConeGeometry(radius, coneHeight, segments)
      )
      const cylinder = createRenderable(cylinderGeometry, crystalMaterial)
      const topCone = createRenderable(coneGeometry, crystalMaterial)
      topCone.position.y = cylinderHeight / 2 + coneHeight / 2
      const bottomCone = createRenderable(coneGeometry, crystalMaterial)
      bottomCone.rotation.x = Math.PI
      bottomCone.position.y = -(cylinderHeight / 2 + coneHeight / 2)

      crystalGroup.add(cylinder, topCone, bottomCone)
      return crystalGroup
    }

    const createNCage = () => {
      const cageGroup = new Group()
      const size = 1.4
      const height = 1
      const pillarThickness = 0.7
      const positions = [
        { x: -size, z: size },
        { x: size, z: size },
        { x: size, z: -size },
        { x: -size, z: -size },
      ]
      const pillarGeometry = prepareGeometry(
        new BoxGeometry(pillarThickness, height * 2, pillarThickness)
      )

      positions.forEach((pos) => {
        const mesh = createRenderable(pillarGeometry, cageMaterial)
        mesh.position.set(pos.x, 0, pos.z)
        cageGroup.add(mesh)
      })

      const faces = [
        { x: 0, z: size, r: 0 },
        { x: size, z: 0, r: Math.PI / 2 },
        { x: 0, z: -size, r: Math.PI },
        { x: -size, z: 0, r: -Math.PI / 2 },
      ]
      const width = size * 1.5
      const shearRate = -(height * 1.2) / width
      const diagonalSourceGeometry = new BoxGeometry(
        width,
        pillarThickness + 0.1,
        pillarThickness
      )
      diagonalSourceGeometry.applyMatrix4(
        new Matrix4().set(
          1,
          0,
          0,
          0,
          shearRate,
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1
        )
      )
      const diagonalGeometry = prepareGeometry(diagonalSourceGeometry)

      faces.forEach((face) => {
        const diagMesh = createRenderable(diagonalGeometry, cageMaterial)
        diagMesh.rotation.y = face.r
        diagMesh.position.set(face.x, 0, face.z)
        cageGroup.add(diagMesh)
      })

      return cageGroup
    }

    crystal = createCrystal()
    cage = createNCage()
    if (useEdgeRendering) {
      // 两个旋转组各合为一次绘制；保留所有原始线段、材质和相对变换。
      for (const target of [crystal, cage]) {
        const positions = []
        const geometries = new Set()
        const point = new Vector3()
        for (const part of target.children) {
          part.updateMatrix()
          geometries.add(part.geometry)
          const { instanceStart, instanceEnd } = part.geometry.attributes
          for (let index = 0; index < instanceStart.count; index++) {
            for (const attribute of [instanceStart, instanceEnd]) {
              point
                .fromBufferAttribute(attribute, index)
                .applyMatrix4(part.matrix)
              positions.push(point.x, point.y, point.z)
            }
          }
        }
        target.clear()
        const geometry = new LineSegmentsGeometry().setPositions(positions)
        target.add(new LineSegments2(geometry, edgeMaterial))
        geometries.forEach((geometry) => geometry.dispose())
      }
    }
    group.add(crystal, cage)
    crystal.rotation.y = START_ROTATION
    cage.rotation.y = -(START_ROTATION - FRONT_ROTATION_OFFSET)
    group.scale.set(0.5, 0.5, 0.5)
  }

  syncBottomAnchor()
  isStopping = false
  stopStartTime = null
  stopStartRotation = null
  stopTargetRotation = null

  animateFrame = (frameTime) => {
    if (!canRender()) {
      animationId = null
      return
    }

    animationId = requestAnimationFrame(animateFrame)
    const deltaSeconds = lastFrameTime
      ? Math.min((frameTime - lastFrameTime) / 1000, 0.05)
      : 0
    lastFrameTime = frameTime

    if (isStopping) {
      if (stopStartTime === null) {
        const completedFrontRotations = Math.floor(
          (crystal.rotation.y - FRONT_ROTATION_OFFSET) / FRONT_ROTATION_INTERVAL
        )

        stopStartTime = frameTime
        stopStartRotation = crystal.rotation.y
        stopTargetRotation =
          FRONT_ROTATION_OFFSET +
          (completedFrontRotations + 1) * FRONT_ROTATION_INTERVAL

        const inheritedVelocity = getRotationSpeed() * (STOP_DURATION / 1000)
        const minimumStopDistance = inheritedVelocity / 3
        if (stopTargetRotation - stopStartRotation < minimumStopDistance) {
          stopTargetRotation += FRONT_ROTATION_INTERVAL
        }
      }

      const progress = Math.min((frameTime - stopStartTime) / STOP_DURATION, 1)
      const inheritedVelocity = getRotationSpeed() * (STOP_DURATION / 1000)
      const progressSquared = progress * progress
      const progressCubed = progressSquared * progress
      const startBasis = 2 * progressCubed - 3 * progressSquared + 1
      const startVelocityBasis = progressCubed - 2 * progressSquared + progress
      const endBasis = -2 * progressCubed + 3 * progressSquared

      crystal.rotation.y =
        startBasis * stopStartRotation +
        startVelocityBasis * inheritedVelocity +
        endBasis * stopTargetRotation
      cage.rotation.y = -(crystal.rotation.y - FRONT_ROTATION_OFFSET)

      if (progress >= 1) {
        crystal.rotation.y = stopTargetRotation
        cage.rotation.y = -(stopTargetRotation - FRONT_ROTATION_OFFSET)
        cancelAnimationFrame(animationId)
        animationId = null
        emit('finished')
      }
    } else {
      const rotationDelta = getRotationSpeed() * deltaSeconds
      crystal.rotation.y += rotationDelta
      cage.rotation.y -= rotationDelta
    }

    controls?.update()
    if (composer) {
      composer.render()
    } else {
      renderer.render(scene, camera)
    }
  }

  const activeRenderer = renderer
  const activeScene = scene
  const activeCamera = camera

  if (!canReuseCachedResources) {
    try {
      await activeRenderer.compileAsync(activeScene, activeCamera)
    } catch {
      // 不支持并行 Shader 编译时由首帧同步编译兜底。
    }
  }

  if (
    isUnmounted ||
    generation !== runtimeGeneration ||
    renderer !== activeRenderer
  ) {
    return
  }

  lastFrameTime = null
  if (canRender() && animationId === null) {
    animationId = requestAnimationFrame(animateFrame)
  }
}

const handleResize = () => {
  if (!camera || !renderer) return
  const { width, height } = getSceneSize()

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(getRendererPixelRatio())
  renderer.setSize(width, height)
  composer?.setSize(width, height)
  syncBottomAnchor()
}

const scheduleResize = () => {
  if (resizeRafId !== null) return

  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null
    handleResize()
  })
}

const syncRenderLoop = () => {
  if (!canRender()) {
    if (animationId !== null) cancelAnimationFrame(animationId)
    animationId = null
    return
  }

  lastFrameTime = null
  if (renderer && animateFrame && animationId === null) {
    animationId = requestAnimationFrame(animateFrame)
  }
}

const handleVisibilityChange = () => {
  isPageVisible = document.visibilityState !== 'hidden'
  syncRenderLoop()
}

const handleIntersection = ([entry]) => {
  isInViewport = entry?.isIntersecting ?? false
  syncRenderLoop()
}

const stop = () => {
  isStopping = true
  syncRenderLoop()
}

const disposeMaterial = (material, disposedResources) => {
  Object.values(material).forEach((value) => {
    if (
      value &&
      typeof value.dispose === 'function' &&
      !disposedResources.has(value)
    ) {
      disposedResources.add(value)
      value.dispose()
    }
  })
  material.dispose()
}

const disposeScene = (targetScene) => {
  if (!targetScene) return
  const disposedGeometries = new Set()
  const disposedMaterials = new Set()
  const disposedResources = new Set()

  targetScene.traverse((object) => {
    if (object.geometry && !disposedGeometries.has(object.geometry)) {
      disposedGeometries.add(object.geometry)
      object.geometry.dispose()
    }

    if (object.material) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]
      materials.forEach((material) => {
        if (disposedMaterials.has(material)) return
        disposedMaterials.add(material)
        disposeMaterial(material, disposedResources)
      })
    }
  })

  targetScene.clear()
}

const disposeResources = (resources) => {
  resources.controls?.dispose()
  resources.composer?.dispose()
  disposeScene(resources.scene)
  resources.environmentMap?.dispose()
  resources.renderer?.renderLists?.dispose()

  if (resources.renderer) {
    resources.renderer.dispose()
    resources.renderer.forceContextLoss()
  }
}

onMounted(() => {
  isUnmounted = false
  isPageVisible = document.visibilityState !== 'hidden'
  initializationPromise = initThree().catch((error) => {
    console.warn('3D Logo 初始化失败', error)
  })
  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '120px 0px',
      threshold: 0,
    })
    if (container.value) visibilityObserver.observe(container.value)
  }
  if ('ResizeObserver' in window && sceneContainer.value) {
    resizeObserver = new ResizeObserver(scheduleResize)
    resizeObserver.observe(sceneContainer.value)
  }
  window.addEventListener('resize', scheduleResize, { passive: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  isUnmounted = true
  runtimeGeneration += 1
  window.removeEventListener('resize', scheduleResize)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  visibilityObserver?.disconnect()
  visibilityObserver = null
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRafId !== null) cancelAnimationFrame(resizeRafId)
  if (animationId !== null) cancelAnimationFrame(animationId)
  resizeRafId = null
  animationId = null

  if (!renderer) return

  const resources = getResources()
  const resourceCacheKey = getResourceCacheKey()
  resources.controls && (resources.controls.enabled = false)
  resources.renderer.domElement?.parentNode?.removeChild(
    resources.renderer.domElement
  )
  clearResourceReferences()

  const releaseResources = () => {
    if (resourceCacheKey) {
      cacheWebGLResource(
        resourceCacheKey,
        resources,
        disposeResources,
        RESOURCE_CACHE_TTL
      )
      return
    }

    deferWebGLResourceDisposal(resources, disposeResources)
  }

  void Promise.resolve(initializationPromise).finally(releaseResources)
  initializationPromise = null
})

defineExpose({
  stop,
})
</script>

<style lang="less" scoped>
.scene-container {
  width: 100vw;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #050505;

  &.is-bottom-anchored {
    // 父级中心已锚在线上，只需扣除晶体投影的半高，让下尖端落在线上。
    transform: translateY(calc(0px - var(--crystal-half-height, 0px)));
  }

  &.is-transparent {
    background-color: transparent;

    .canvas-container {
      background-color: transparent;
    }

    :deep(canvas) {
      background-color: transparent;
    }
  }
}

.canvas-container {
  background-color: #050505;
  :deep(canvas) {
    background-color: #050505;
    transform: scale(0.5);
    transform-origin: center;
  }
}
</style>
