import * as THREE from 'three'

import {
  PHOTO_MAX_FOCAL_LENGTH,
  PHOTO_MIN_FOCAL_LENGTH,
} from '@/config/atriumPhoto'
import { PHOTO_THEMES } from '@/stores/atriumPhotoComponents'
import { loadIslandLucarioModel } from '@/utils/islandLucarioModel'

import type { AtriumPhotoFraming } from './atriumPhotoFraming'
import { isHomeSceneDiagnosticsEnabled } from './diagnostics'
import { createLucarioWireGeometry } from './lucarioWireGeometry'
import { createModelScan, createModelWireMaterials } from './modelScan'

/** 拍照工作室独立拥有所有可变模型和 GPU 资源，下载缓存仅作为只读输入。 */
export function createAtriumPhotoScene(
  host: HTMLElement,
  invalidate: () => void,
  theme: 'light' | 'dark',
  framing: AtriumPhotoFraming,
  onFocalLengthChange: (value: number) => void,
  mobile = false
) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    framing.camera.fov,
    1,
    framing.camera.near,
    framing.camera.far
  )
  // 36mm 胶片基准；默认保留原 fov，仅在用户调整后使用显式焦距。
  camera.filmGauge = 36
  let selectedFocalLength: number | undefined
  camera.position.fromArray(framing.camera.position)
  camera.quaternion.fromArray(framing.camera.quaternion)
  camera.zoom = framing.camera.zoom
  const baseCameraPosition = camera.position.clone()
  const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
    camera.quaternion
  )
  const baseDepth = new THREE.Vector3()
    .fromArray(framing.model.position)
    .sub(baseCameraPosition)
    .dot(cameraForward)
  const baseHalfFovSlope = Math.tan(
    THREE.MathUtils.degToRad(framing.camera.fov / 2)
  )
  let dollyScale = 1
  let cameraDepth = baseDepth
  const localBounds = new THREE.Box3()
  const corner = new THREE.Vector3()
  const rootQuaternion = new THREE.Quaternion()
  const rootScale = new THREE.Vector3().fromArray(framing.model.scale)
  const model = new THREE.Group()
  model.position.fromArray(framing.model.position)
  model.scale.fromArray(framing.model.scale)
  scene.add(model)
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xe84d6b,
    side: THREE.DoubleSide,
    flatShading: true,
    clearcoat: 0.45,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.8,
  })
  const { wire: wireMaterial, depth: wireDepthMaterial } =
    createModelWireMaterials(0xe23456)
  wireMaterial.opacity = 1
  wireDepthMaterial.opacity = 0.55
  const wireScan = createModelScan(
    wireMaterial.color,
    mobile ? 2.28200669 : 4.27876255
  )
  wireScan.progress.value = 1
  // 拍照只显示线条和流光；深度预通道仍遮挡背线，但不写入任何黑色面。
  wireScan.fillOpacity.value = 0
  wireScan.install(wireMaterial, 'composite')
  let wireGeometry: THREE.BufferGeometry | undefined
  let wireMesh: THREE.Mesh | undefined
  let wireDepthMesh: THREE.Mesh | undefined
  let lastFlowTime = performance.now()
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
  const outlineResolution = new THREE.Vector2(1, 1)
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    transparent: true,
  })
  // 用屏幕像素外扩背面轮廓；相机缩放和焦距变化时仍保持约 4px 的外描边。
  outlineMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.outlineResolution = { value: outlineResolution }
    shader.vertexShader =
      'uniform vec2 outlineResolution;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
      vec2 outlineDirection = (projectionMatrix * vec4(normalMatrix * normal, 0.0)).xy;
      float outlineLength = length(outlineDirection);
      if (outlineLength > 0.0001) {
        gl_Position.xy += outlineDirection / outlineLength * (8.0 / outlineResolution) * gl_Position.w;
      }`
      )
  }
  let subjectMesh: THREE.Mesh | undefined
  let outlineMesh: THREE.Mesh | undefined
  let modelForm: 'default' | 'wireframe' = 'default'
  let modelOutline = false
  const applyModelAppearance = () => {
    if (subjectMesh) subjectMesh.visible = modelForm === 'default'
    if (wireMesh) wireMesh.visible = modelForm === 'wireframe'
    if (wireDepthMesh) wireDepthMesh.visible = modelForm === 'wireframe'
    lastFlowTime = performance.now()
    if (outlineMesh) outlineMesh.visible = modelOutline
    if (diagnostics) {
      host.dataset.modelForm = modelForm
      host.dataset.modelOutline = String(modelOutline)
    }
    invalidate()
  }
  const ambient = new THREE.AmbientLight(0xb45d71, 0.65)
  const key = new THREE.DirectionalLight(0xffb7c9, 1.6)
  key.position.set(-5, 10, 8)
  const rim = new THREE.DirectionalLight(0xf21148, 2.8)
  rim.position.set(6, 6, -9)
  scene.add(ambient, key, rim)
  let geometry: THREE.BufferGeometry | undefined
  let environment: THREE.DataTexture | undefined
  let disposed = false
  let loaded = false
  let width = 0
  let height = 0
  const pan = new THREE.Vector2()
  let pointer: { id: number; x: number; y: number; pan: boolean } | null = null
  const touches = new Map<number, { x: number; y: number }>()
  const touchCenter = () => {
    const pair = [...touches.values()].slice(0, 2)
    return { x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 }
  }
  const diagnostics = isHomeSceneDiagnosticsEnabled()
  const publish = () => {
    if (!diagnostics) return
    host.dataset.statueBodyRotation = `${model.rotation.x.toFixed(
      5
    )},${model.rotation.y.toFixed(5)}`
    host.dataset.cameraZoom = String(camera.zoom)
    host.dataset.dollyScale = String(dollyScale)
    host.dataset.cameraDepth = String(cameraDepth)
    host.dataset.cameraFov = String(camera.fov)
    host.dataset.focalLength = String(camera.getFocalLength())
    host.dataset.cameraPosition = camera.position.toArray().join(',')
    host.dataset.photoPan = pan.toArray().join(',')
    host.dataset.pose = 'standing'
    camera.updateMatrixWorld()
    model.updateWorldMatrix(true, false)
    host.dataset.photoFramingProjection = new THREE.Matrix4()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      .multiply(model.matrixWorld)
      .elements.join(',')
  }
  const positionCamera = () => {
    const baseFocalLength = (0.5 * camera.getFilmHeight()) / baseHalfFovSlope
    const focalRatio =
      selectedFocalLength === undefined
        ? 1
        : selectedFocalLength / baseFocalLength
    let nearest = 0
    let farthest = 0
    model.updateMatrix()
    model.getWorldQuaternion(rootQuaternion)
    if (!localBounds.isEmpty()) {
      // 旋转后用局部包围盒的八个角估算前后深度，限制近摄，避免穿入模型。
      for (let index = 0; index < 8; index++) {
        corner
          .set(
            index & 1 ? localBounds.max.x : localBounds.min.x,
            index & 2 ? localBounds.max.y : localBounds.min.y,
            index & 4 ? localBounds.max.z : localBounds.min.z
          )
          .multiply(rootScale)
          .applyQuaternion(rootQuaternion)
        const depth = corner.dot(cameraForward)
        nearest = Math.max(nearest, -depth)
        farthest = Math.max(farthest, depth)
      }
    }
    // 焦距联动拍摄距离，保持模型中心所在平面的取景比例；滚轮单独改变距离。
    cameraDepth = Math.max(
      (baseDepth * focalRatio) / dollyScale,
      nearest + Math.max(camera.near * 2, 0.2)
    )
    camera.position
      .copy(baseCameraPosition)
      .addScaledVector(cameraForward, baseDepth - cameraDepth)
    camera.far = Math.max(framing.camera.far, cameraDepth + farthest + 10)
  }
  const project = () => {
    if (!width || !height) return
    camera.aspect = width / height
    if (selectedFocalLength !== undefined)
      camera.setFocalLength(selectedFocalLength)
    positionCamera()
    // 按进入拍照时的 Atrium 数值构图初始化，平移叠加在原有投影偏移上。
    const offset = framing.camera.offset
    camera.setViewOffset(
      width / offset.width,
      height / offset.height,
      (width / offset.width) * offset.x - width * pan.x,
      (height / offset.height) * offset.y - height * pan.y,
      width,
      height
    )
    camera.updateProjectionMatrix()
    onFocalLengthChange(camera.getFocalLength())
    publish()
    invalidate()
  }
  const setTheme = (next: 'light' | 'dark') => {
    theme = next
    material.metalness = theme === 'light' ? 0.72 : 1
    material.roughness = theme === 'light' ? 0.22 : 0.09
    ambient.intensity = theme === 'light' ? 1.5 : 0.65
    key.intensity = theme === 'light' ? 2.3 : 1.6
    rim.intensity = theme === 'light' ? 1.4 : 2.8
    invalidate()
  }
  setTheme(theme)
  const render = () => {
    if (
      disposed ||
      !loaded ||
      !width ||
      !height ||
      document.hidden ||
      renderer.getContext().isContextLost()
    )
      return
    const now = performance.now()
    const flowActive = modelForm === 'wireframe' && !motionPreference.matches
    wireScan.flowEnabled.value = flowActive ? 1 : 0
    if (flowActive) wireScan.advanceFlow((now - lastFlowTime) / 1000)
    lastFlowTime = now
    renderer.render(scene, camera)
    if (diagnostics) {
      host.dataset.wireFlowTime = String(wireScan.flowTime.value)
      host.dataset.wireFlowActive = String(flowActive)
    }
    publish()
    // 复用帧任务持续绘制流光，实体模式、后台页面和减少动态效果时停止循环。
    if (flowActive) invalidate()
  }
  const resize = (nextWidth: number, nextHeight: number) => {
    width = nextWidth
    height = nextHeight
    if (!width || !height || disposed) return
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height, false)
    outlineResolution.set(width, height)
    project()
  }
  const observer = new ResizeObserver(([entry]) => {
    if (entry) resize(entry.contentRect.width, entry.contentRect.height)
  })
  observer.observe(host)
  const pointerDown = (event: PointerEvent) => {
    if (!loaded || pointer) return
    if (event.pointerType === 'touch') {
      event.preventDefault()
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
      renderer.domElement.setPointerCapture(event.pointerId)
      return
    }
    if (touches.size || (event.button !== 0 && event.button !== 2)) return
    event.preventDefault()
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan: event.button === 2,
    }
    renderer.domElement.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: PointerEvent) => {
    const touch = touches.get(event.pointerId)
    if (touch) {
      event.preventDefault()
      if (touches.size >= 2) {
        // 双指使用中心位移；第二指加入和任意一指抬起时不改变已有构图。
        const before = touchCenter()
        touch.x = event.clientX
        touch.y = event.clientY
        const after = touchCenter()
        if (width && height) {
          pan.x += (after.x - before.x) / width
          pan.y += (after.y - before.y) / height
        }
      } else {
        model.rotation.y += (event.clientX - touch.x) * 0.008
        model.rotation.x = THREE.MathUtils.clamp(
          model.rotation.x + (event.clientY - touch.y) * 0.005,
          -0.65,
          0.65
        )
        touch.x = event.clientX
        touch.y = event.clientY
      }
      project()
      return
    }
    if (pointer?.id !== event.pointerId) return
    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y
    if (pointer.pan) {
      if (width && height) {
        pan.x += dx / width
        pan.y += dy / height
      }
      project()
    } else {
      model.rotation.y += dx * 0.008
      model.rotation.x = THREE.MathUtils.clamp(
        model.rotation.x + dy * 0.005,
        -0.65,
        0.65
      )
    }
    pointer.x = event.clientX
    pointer.y = event.clientY
    if (!pointer.pan) project()
    invalidate()
  }
  const pointerUp = (event: PointerEvent) => {
    if (touches.has(event.pointerId)) touches.delete(event.pointerId)
    else if (pointer?.id === event.pointerId) pointer = null
    else return
    if (renderer.domElement.hasPointerCapture(event.pointerId))
      renderer.domElement.releasePointerCapture(event.pointerId)
  }
  const contextMenu = (event: MouseEvent) => event.preventDefault()
  const wheel = (event: WheelEvent) => {
    event.preventDefault()
    if (!loaded) return
    dollyScale = THREE.MathUtils.clamp(
      dollyScale * Math.exp(-event.deltaY * 0.001),
      0.45,
      3
    )
    project()
  }
  const contextLost = (event: Event) => event.preventDefault()
  const refresh = () => invalidate()
  motionPreference.addEventListener('change', refresh)
  renderer.domElement.addEventListener('pointerdown', pointerDown)
  renderer.domElement.addEventListener('pointermove', pointerMove)
  renderer.domElement.addEventListener('pointerup', pointerUp)
  renderer.domElement.addEventListener('pointercancel', pointerUp)
  renderer.domElement.addEventListener('lostpointercapture', pointerUp)
  renderer.domElement.addEventListener('contextmenu', contextMenu)
  renderer.domElement.addEventListener('wheel', wheel, { passive: false })
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  renderer.domElement.addEventListener('webglcontextrestored', refresh)
  document.addEventListener('visibilitychange', refresh)
  // 异步返回时先检查实例是否已退出；不向已释放的渲染器上传资源。
  const ready = loadIslandLucarioModel().then((asset) => {
    if (disposed) return
    geometry = new THREE.BufferGeometry()
    for (const [name, source, itemSize] of [
      ['position', 'positions', 3],
      ['normal', 'normals', 3],
    ] as const) {
      const attribute = asset.metadata.attributes[source]
      geometry.setAttribute(
        name,
        new THREE.BufferAttribute(
          new Float32Array(
            asset.buffer,
            attribute.offset,
            attribute.count
          ).slice(),
          itemSize
        )
      )
    }
    const indices = asset.metadata.attributes.indices
    geometry.setIndex(
      new THREE.BufferAttribute(
        new Uint16Array(asset.buffer, indices.offset, indices.count).slice(),
        1
      )
    )
    geometry.computeBoundingBox()
    localBounds
      .copy(geometry.boundingBox!)
      .translate(
        new THREE.Vector3().fromArray(asset.metadata.center).multiplyScalar(-1)
      )
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.fromArray(asset.metadata.center).multiplyScalar(-1)
    model.add(mesh)
    subjectMesh = mesh
    outlineMesh = new THREE.Mesh(geometry, outlineMaterial)
    outlineMesh.position.copy(mesh.position)
    outlineMesh.renderOrder = -1
    model.add(outlineMesh)
    wireScan.bounds.value.set(
      geometry.boundingBox!.min.y,
      geometry.boundingBox!.max.y - geometry.boundingBox!.min.y
    )
    wireGeometry = createLucarioWireGeometry(geometry)
    wireMesh = new THREE.Mesh(wireGeometry, wireMaterial)
    wireMesh.position.copy(mesh.position)
    wireMesh.renderOrder = 1
    wireDepthMesh = new THREE.Mesh(wireGeometry, wireDepthMaterial)
    wireDepthMesh.position.copy(mesh.position)
    wireDepthMesh.renderOrder = -2
    model.add(wireDepthMesh, wireMesh)
    applyModelAppearance()
    if (diagnostics)
      host.dataset.wireVertexCount = String(
        wireGeometry.getAttribute('position').count
      )
    environment = new THREE.DataTexture(
      new Uint16Array(asset.radiance.slice(0)),
      asset.environment.width,
      asset.environment.height,
      THREE.RGBAFormat,
      THREE.HalfFloatType
    )
    environment.mapping = THREE.CubeUVReflectionMapping
    environment.minFilter = environment.magFilter = THREE.LinearFilter
    environment.needsUpdate = true
    scene.environment = environment
    scene.environmentRotation.y = THREE.MathUtils.degToRad(-100)
    loaded = true
    host.dataset.ready = 'true'
    project()
  })
  return {
    ready,
    render,
    setTheme,
    setModelAppearance: (form: 'default' | 'wireframe', outline: boolean) => {
      modelForm = form
      modelOutline = outline
      applyModelAppearance()
    },
    setPalette: (name: keyof typeof PHOTO_THEMES) => {
      const palette = PHOTO_THEMES[name]
      material.color.set(palette.material)
      wireMaterial.color.set(palette.accent)
      ambient.color.set(palette.ambient)
      key.color.set(palette.key)
      rim.color.set(palette.rim)
      if (diagnostics) host.dataset.photoTheme = name
      invalidate()
    },
    setFocalLength: (value: number) => {
      if (disposed || !Number.isFinite(value)) return
      selectedFocalLength = THREE.MathUtils.clamp(
        value,
        PHOTO_MIN_FOCAL_LENGTH,
        PHOTO_MAX_FOCAL_LENGTH
      )
      // 广角靠近、长焦后退，以相近主体大小展示真实透视差异。
      project()
    },
    setPose: (_pose: 'standing') => {
      model.rotation.set(0, 0, 0)
      project()
    },
    capture: async () => {
      if (disposed || !loaded || renderer.getContext().isContextLost())
        throw new Error('Photo scene unavailable')
      const { toCanvas } = await import('html-to-image')
      const background = document.querySelector<HTMLElement>('.star-container')
      const ratio = renderer.getPixelRatio()
      const sky = background
        ? await toCanvas(background, { pixelRatio: ratio, skipFonts: true })
        : null
      if (disposed) return
      const output = document.createElement('canvas')
      output.width = Math.round(width * ratio)
      output.height = Math.round(height * ratio)
      const context = output.getContext('2d')!
      const backdrop = document.querySelector('.backdrop-color-base')
      context.fillStyle = backdrop
        ? getComputedStyle(backdrop).backgroundColor
        : theme === 'light'
        ? '#f4f4f4'
        : '#08080a'
      context.fillRect(0, 0, output.width, output.height)
      if (sky && background) {
        const bounds = background.getBoundingClientRect()
        context.drawImage(
          sky,
          bounds.left * ratio,
          bounds.top * ratio,
          bounds.width * ratio,
          bounds.height * ratio
        )
      }
      // 重绘后同步读取 WebGL 画布，不依赖 preserveDrawingBuffer。
      render()
      context.drawImage(renderer.domElement, 0, 0, output.width, output.height)
      const blob = await new Promise<Blob | null>((resolve) =>
        output.toBlob(resolve, 'image/png')
      )
      if (disposed) return
      if (!blob) throw new Error('Photo export failed')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `atrium-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.png`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      touches.clear()
      pointer = null
      observer.disconnect()
      document.removeEventListener('visibilitychange', refresh)
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', pointerUp)
      renderer.domElement.removeEventListener('lostpointercapture', pointerUp)
      renderer.domElement.removeEventListener('contextmenu', contextMenu)
      renderer.domElement.removeEventListener('wheel', wheel)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      renderer.domElement.removeEventListener('webglcontextrestored', refresh)
      geometry?.dispose()
      material.dispose()
      wireMaterial.dispose()
      wireDepthMaterial.dispose()
      wireGeometry?.dispose()
      motionPreference.removeEventListener('change', refresh)
      outlineMaterial.dispose()
      environment?.dispose()
      scene.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
