<template>
  <div class="scene-container">
    <div class="loading-text">{{ currentText }}</div>
    <div ref="container" class="canvas-container" />
  </div>
</template>

<script setup>
import { defineEmits, onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const emit = defineEmits(['finished'])

const container = ref(null)
const currentText = ref('< CRAFTING />')
let isStopping = false // 新增：是否正在执行停止逻辑
let renderer, scene, camera, composer, controls, animationId

// 初始化 3D 场景
const initThree = () => {
  // --- 1. 场景与基础设置 ---
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#050505')
  scene.fog = new THREE.FogExp2(0x050505, 0.02)

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  )
  camera.position.set(0, 0, 9)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // 挂载到 ref
  container.value.appendChild(renderer.domElement)

  // --- 2. 高级光照系统 ---
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  scene.environment = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
  ).texture

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
  scene.add(ambientLight)

  const spotLight = new THREE.SpotLight(0xffffff, 50)
  spotLight.position.set(5, 10, 5)
  spotLight.angle = Math.PI / 4
  spotLight.penumbra = 0.5
  spotLight.castShadow = true
  spotLight.shadow.bias = -0.0001
  scene.add(spotLight)

  // --- 3. 后期处理 (Bloom 辉光) ---
  const renderScene = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
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

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05

  // --- 4. 材质与物体 ---
  const cageMaterial = new THREE.MeshStandardMaterial({
    color: 'black',
    metalness: 0.5,
    roughness: 0.5,
    envMapIntensity: 0,
  })

  const crystalMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.01,
    roughness: 0.01,
    transmission: 1,
    thickness: 2,
    ior: 1.5,
    reflectivity: 0.1,
    side: THREE.DoubleSide,
    transparent: true,
  })

  const group = new THREE.Group()
  scene.add(group)

  // 构建晶体
  const createCrystal = () => {
    const crystalGroup = new THREE.Group()
    const radius = 1.5
    const cylinderHeight = 4
    const coneHeight = radius * 1.3
    const segments = 4

    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, cylinderHeight, segments),
      crystalMaterial
    )
    const topCone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, coneHeight, segments),
      crystalMaterial
    )
    topCone.position.y = cylinderHeight / 2 + coneHeight / 2
    const bottomCone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, coneHeight, segments),
      crystalMaterial
    )
    bottomCone.rotation.x = Math.PI
    bottomCone.position.y = -(cylinderHeight / 2 + coneHeight / 2)

    crystalGroup.add(cylinder, topCone, bottomCone)
    return crystalGroup
  }

  // 构建外骨架
  const createNCage = () => {
    const cageGroup = new THREE.Group()
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
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(pillarThickness, height * 2, pillarThickness),
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
      const diagGeo = new THREE.BoxGeometry(
        width,
        pillarThickness + 0.1,
        pillarThickness
      )
      const shearMatrix = new THREE.Matrix4().set(
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
      const diagMesh = new THREE.Mesh(diagGeo, cageMaterial)
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

  // 动画循环
  const animate = () => {
    animationId = requestAnimationFrame(animate)

    if (isStopping) {
      currentText.value = 'COMPLETE.'

      // 2. 只有当正弦值接近 0，且余弦值接近 1（代表正面）时触发
      if (crystal.rotation.y % (Math.PI / 4) <= 0.02) {
        cancelAnimationFrame(animationId)
        animationId = null
        emit('finished')
      } else {
        // 还没对齐，继续缓慢旋转
        crystal.rotation.y += 0.02
        cage.rotation.y -= 0.02
      }
    } else {
      // 正常旋转状态
      crystal.rotation.y += 0.02
      cage.rotation.y -= 0.02
    }

    controls.update()
    composer.render()
  }

  animate()
}

// 窗口大小适配
const handleResize = () => {
  if (!camera || !renderer) return
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
}

const stop = () => {
  // 不再立即改文字，而是标记“准备停止”
  isStopping = true
}

onMounted(() => {
  initThree()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  cancelAnimationFrame(animationId)
  // 清理内存
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
  }
})

// 暴露方法给父组件
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
}

.canvas-container {
  /* width: 100px;
  height: 100px; */
  /* zoom: 0.6; */
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
  color: var(--text-color);
  letter-spacing: 10px;
  font-family: Futura, 'Century Gothic', AppleGothic, sans-serif;
}
</style>
