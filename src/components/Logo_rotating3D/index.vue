<template>
  <div class="scene-container" :class="{ 'is-transparent': transparent }">
    <!-- <div class="loading-text">{{ currentText }}</div> -->
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
  DoubleSide,
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
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const emit = defineEmits(['finished'])
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
})

const container = ref(null)
const currentText = ref('LOADING')
let isStopping = false
let renderer, scene, camera, composer, controls, animationId
let environmentMap = null
let resizeRafId = null
let isPageVisible = true
let lastFrameTime = null
let animateFrame = null
const ROTATION_SPEED = 0.6
const STOP_DURATION = 700

const getSceneSize = () => {
  const rect = container.value?.getBoundingClientRect()

  return {
    width: Math.max(1, Math.round(rect?.width || window.innerWidth)),
    height: Math.max(1, Math.round(rect?.height || window.innerHeight)),
  }
}

const initThree = () => {
  const { width, height } = getSceneSize()

  scene = new Scene()
  scene.background = props.transparent ? null : new Color('#050505')
  if (!props.transparent) {
    scene.fog = new FogExp2(0x050505, 0.02)
  }

  camera = new PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 0, 9)
  camera.lookAt(0, 0, 0)

  renderer = new WebGLRenderer({
    alpha: props.transparent,
    antialias: !props.lowPower,
    powerPreference: props.lowPower ? 'low-power' : 'high-performance',
  })
  renderer.setPixelRatio(
    props.lowPower ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.5)
  )
  renderer.setSize(width, height)

  renderer.shadowMap.enabled = !props.lowPower
  renderer.shadowMap.type = PCFSoftShadowMap

  container.value.appendChild(renderer.domElement)

  const pmremGenerator = new PMREMGenerator(renderer)
  environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
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

  if (!props.lowPower) {
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
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
  }

  const cageMaterial = new MeshStandardMaterial({
    color: 'black',
    metalness: 0.5,
    roughness: 0.5,
    envMapIntensity: 0,
  })

  const crystalMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.01,
    roughness: 0.01,
    transmission: 1,
    thickness: 2,
    ior: 1.5,
    reflectivity: 0.1,
    side: DoubleSide,
    transparent: true,
  })

  const group = new Group()
  scene.add(group)

  const createCrystal = () => {
    const crystalGroup = new Group()
    const radius = 1.5
    const cylinderHeight = 4
    const coneHeight = radius * 1.3
    const segments = 4

    const cylinder = new Mesh(
      new CylinderGeometry(radius, radius, cylinderHeight, segments),
      crystalMaterial
    )
    const topCone = new Mesh(
      new ConeGeometry(radius, coneHeight, segments),
      crystalMaterial
    )
    topCone.position.y = cylinderHeight / 2 + coneHeight / 2
    const bottomCone = new Mesh(
      new ConeGeometry(radius, coneHeight, segments),
      crystalMaterial
    )
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

    positions.forEach((pos) => {
      const mesh = new Mesh(
        new BoxGeometry(pillarThickness, height * 2, pillarThickness),
        cageMaterial
      )
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

    faces.forEach((face) => {
      const diagGeo = new BoxGeometry(
        width,
        pillarThickness + 0.1,
        pillarThickness
      )
      const shearMatrix = new Matrix4().set(
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
      diagGeo.applyMatrix4(shearMatrix)
      const diagMesh = new Mesh(diagGeo, cageMaterial)
      diagMesh.rotation.y = face.r
      diagMesh.position.set(face.x, 0, face.z)
      cageGroup.add(diagMesh)
    })

    return cageGroup
  }

  const crystal = createCrystal()
  const cage = createNCage()
  group.add(crystal, cage)
  crystal.rotation.y = Math.PI / 4
  group.scale.set(0.5, 0.5, 0.5)

  let stopStartTime = null
  let stopStartRotation = null
  let stopTargetRotation = null

  animateFrame = (frameTime) => {
    if (!isPageVisible) {
      animationId = null
      return
    }

    animationId = requestAnimationFrame(animateFrame)
    const deltaSeconds = lastFrameTime
      ? Math.min((frameTime - lastFrameTime) / 1000, 0.05)
      : 0
    lastFrameTime = frameTime

    if (isStopping) {
      currentText.value = 'COMPLETE.'

      if (stopStartTime === null) {
        const frontRotationOffset = Math.PI / 4
        const frontRotationInterval = Math.PI / 2
        const completedFrontRotations = Math.floor(
          (crystal.rotation.y - frontRotationOffset) / frontRotationInterval
        )

        stopStartTime = frameTime
        stopStartRotation = crystal.rotation.y
        stopTargetRotation =
          frontRotationOffset +
          (completedFrontRotations + 1) * frontRotationInterval

        const inheritedVelocity = ROTATION_SPEED * (STOP_DURATION / 1000)
        const minimumStopDistance = inheritedVelocity / 3
        if (stopTargetRotation - stopStartRotation < minimumStopDistance) {
          stopTargetRotation += frontRotationInterval
        }
      }

      const progress = Math.min((frameTime - stopStartTime) / STOP_DURATION, 1)
      const inheritedVelocity = ROTATION_SPEED * (STOP_DURATION / 1000)
      const progressSquared = progress * progress
      const progressCubed = progressSquared * progress
      const startBasis = 2 * progressCubed - 3 * progressSquared + 1
      const startVelocityBasis = progressCubed - 2 * progressSquared + progress
      const endBasis = -2 * progressCubed + 3 * progressSquared

      crystal.rotation.y =
        startBasis * stopStartRotation +
        startVelocityBasis * inheritedVelocity +
        endBasis * stopTargetRotation
      cage.rotation.y = -(crystal.rotation.y - Math.PI / 4)

      if (progress >= 1) {
        crystal.rotation.y = stopTargetRotation
        cage.rotation.y = -(stopTargetRotation - Math.PI / 4)
        cancelAnimationFrame(animationId)
        animationId = null
        emit('finished')
      }
    } else {
      const rotationDelta = ROTATION_SPEED * deltaSeconds
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

  animateFrame()
}

const handleResize = () => {
  if (!camera || !renderer) return
  const { width, height } = getSceneSize()

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(
    props.lowPower ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.5)
  )
  renderer.setSize(width, height)
  composer?.setSize(width, height)
}

const scheduleResize = () => {
  if (resizeRafId !== null) return

  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null
    handleResize()
  })
}

const handleVisibilityChange = () => {
  isPageVisible = document.visibilityState !== 'hidden'

  if (!isPageVisible) {
    if (animationId) cancelAnimationFrame(animationId)
    animationId = null
    return
  }

  lastFrameTime = null
  if (renderer && animateFrame && !animationId) {
    animationId = requestAnimationFrame(animateFrame)
  }
}

const stop = () => {
  isStopping = true
  if (isPageVisible && renderer && animateFrame && !animationId) {
    animationId = requestAnimationFrame(animateFrame)
  }
}

const disposeMaterial = (material) => {
  Object.values(material).forEach((value) => {
    if (value && typeof value.dispose === 'function') {
      value.dispose()
    }
  })
  material.dispose()
}

const disposeScene = () => {
  if (!scene) return

  scene.traverse((object) => {
    if (object.geometry) object.geometry.dispose()

    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(disposeMaterial)
      } else {
        disposeMaterial(object.material)
      }
    }
  })

  scene.clear()
}

onMounted(() => {
  isPageVisible = document.visibilityState !== 'hidden'
  initThree()
  window.addEventListener('resize', scheduleResize, { passive: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleResize)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (resizeRafId !== null) cancelAnimationFrame(resizeRafId)
  if (animationId) cancelAnimationFrame(animationId)

  if (controls) controls.dispose()
  if (composer) composer.dispose()
  disposeScene()
  if (environmentMap) environmentMap.dispose()

  if (renderer) {
    renderer.domElement?.parentNode?.removeChild(renderer.domElement)
    renderer.dispose()
    renderer.forceContextLoss()
  }

  renderer = null
  scene = null
  camera = null
  composer = null
  controls = null
  environmentMap = null
  animateFrame = null
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
    zoom: 0.5;
  }
}
.loading-text {
  position: absolute;
  margin: 0 auto;
  top: calc(50% + 200px);
  color: #fff;

  font-weight: 800;
  font-size: 30px;
  font-family: 'Avenir', 'Segoe UI Semibold', 'Microsoft YaHei UI', sans-serif;
}
</style>
