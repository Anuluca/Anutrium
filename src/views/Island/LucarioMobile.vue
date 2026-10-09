<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'

import { subscribePointerSamples } from '@/utils/pointerSamples'
import { setSmoothScrollLocked } from '@/utils/smoothScroll'

const stage = ref<HTMLElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const MODEL_FPS = 60
const POINTER_SAMPLE_MS = 1000 / 30
let disposed = false
let cleanup: (() => void) | undefined

onMounted(async () => {
  setSmoothScrollLocked('island-lucario', true)
  try {
    const [THREE, { loadIslandLucarioModel }] = await Promise.all([
      import('three'),
      import('@/utils/islandLucarioModel'),
    ])
    if (disposed || !stage.value) return
    const modelPromise = loadIslandLucarioModel()

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.style.opacity = '0'
    renderer.domElement.setAttribute(
      'aria-label',
      '头部跟随指针的路卡利欧三维模型'
    )
    stage.value.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    let environmentTexture: InstanceType<typeof THREE.DataTexture> | undefined
    const chromeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe84d6b,
      side: THREE.DoubleSide,
      metalness: 1,
      roughness: 0.09,
      clearcoat: 0.45,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.8,
    })
    const headRotation = { value: new THREE.Vector4(0, 0, 0, 1) }
    const headPivot = { value: new THREE.Vector3() }
    const bottomBlackRange = { value: new THREE.Vector2() }
    const entryMaterial = new THREE.MeshBasicMaterial({
      color: 0xe23456,
      wireframe: true,
      toneMapped: false,
    })
    const applyBottomDarkening = (shader: {
      uniforms: Record<string, unknown>
      fragmentShader: string
    }) => {
      shader.uniforms.bottomBlackRange = bottomBlackRange
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform vec2 bottomBlackRange;'
        )
        .replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          gl_FragColor.rgb *= smoothstep(bottomBlackRange.x, bottomBlackRange.y, gl_FragCoord.y);`
        )
    }
    const applyModelShader: typeof chromeMaterial.onBeforeCompile = (
      shader
    ) => {
      applyBottomDarkening(shader)
      shader.uniforms.headRotation = headRotation
      shader.uniforms.headPivot = headPivot
      // 仅更新旋转 uniform，GPU 变换位置和法线，不再逐帧改写/上传整个顶点缓冲。
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
        attribute float headInfluence;
        uniform vec4 headRotation;
        uniform vec3 headPivot;
        vec3 rotateHead(vec3 value, vec4 q) {
          return value + 2.0 * cross(q.xyz, cross(q.xyz, value) + q.w * value);
        }
        vec4 getHeadRotation() {
          if (headInfluence >= 0.999) return headRotation;
          if (headInfluence <= 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
          float angle = acos(clamp(headRotation.w, -1.0, 1.0));
          return vec4(headRotation.xyz * sin(angle * headInfluence) / max(sin(angle), 0.00001), cos(angle * headInfluence));
        }`
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
          objectNormal = rotateHead(objectNormal, getHeadRotation());`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          transformed = rotateHead(transformed - headPivot, getHeadRotation()) + headPivot;`
        )
    }
    entryMaterial.onBeforeCompile = applyModelShader
    chromeMaterial.onBeforeCompile = applyModelShader
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0.2, 6)
    camera.lookAt(0, 0, 0)

    const turntable = new THREE.Group()
    scene.add(turntable)
    let invalidate = () => {}
    // 保持近景距离，让桌面和手机均以上半身为主，下半身可超出画面。
    const resize = () => {
      if (!stage.value) return
      // 路由进入时有 scale 动画，使用未受 transform 影响的布局尺寸。
      const width = stage.value.clientWidth
      const height = stage.value.clientHeight
      if (!width || !height) return
      // 额外绘制上下区域，缩放入场时模型不会暴露画布底部的截断边缘。
      const bleed = Math.ceil(window.innerHeight * 0.3)
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      renderer.setPixelRatio(pixelRatio)
      bottomBlackRange.value.set(
        bleed * renderer.getPixelRatio(),
        (bleed + height * 0.5) * renderer.getPixelRatio()
      )
      stage.value.style.setProperty('--canvas-bleed', `${bleed}px`)
      stage.value.style.setProperty('--stage-height', `${height}px`)
      renderer.setSize(width, height + bleed * 2, false)
      camera.aspect = width / height
      camera.setViewOffset(width, height, 0, -bleed, width, height + bleed * 2)
      camera.position.z = 6
      camera.updateProjectionMatrix()
      invalidate()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(stage.value)
    resize()
    cleanup = () => {
      observer.disconnect()
      turntable.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose()
      })
      chromeMaterial.dispose()
      entryMaterial.dispose()
      scene.environment = null
      environmentTexture?.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }

    const { metadata, buffer, environment, radiance } = await modelPromise
    if (disposed) return
    environmentTexture = new THREE.DataTexture(
      new Uint16Array(radiance),
      environment.width,
      environment.height,
      THREE.RGBAFormat,
      THREE.HalfFloatType
    )
    environmentTexture.mapping = THREE.CubeUVReflectionMapping
    environmentTexture.minFilter = THREE.LinearFilter
    environmentTexture.magFilter = THREE.LinearFilter
    environmentTexture.needsUpdate = true
    scene.environment = environmentTexture
    const { attributes } = metadata
    const surface = new THREE.BufferGeometry()
    for (const [name, source, itemSize] of [
      ['position', 'positions', 3],
      ['normal', 'normals', 3],
      ['headInfluence', 'weights', 1],
    ] as const) {
      const attribute = attributes[source]
      surface.setAttribute(
        name,
        new THREE.BufferAttribute(
          new Float32Array(buffer, attribute.offset, attribute.count),
          itemSize
        )
      )
    }
    surface.setIndex(
      new THREE.BufferAttribute(
        new Uint16Array(
          buffer,
          attributes.indices.offset,
          attributes.indices.count
        ),
        1
      )
    )
    headPivot.value.fromArray(metadata.headPivot)
    const mesh = new THREE.Mesh(surface, chromeMaterial)
    mesh.position.fromArray(metadata.center).multiplyScalar(-1)
    turntable.add(mesh)
    turntable.scale.setScalar(5.2 / metadata.size[1])
    turntable.position.y = -0.65
    for (const [name, value] of Object.entries(metadata.stats))
      stage.value!.dataset[name] = String(value)
    stage.value!.dataset.pointerSampleMs = String(POINTER_SAMPLE_MS)
    stage.value!.dataset.maxFps = String(MODEL_FPS)
    status.value = 'ready'

    const target = new THREE.Vector2()
    const current = new THREE.Vector2()
    const rotation = new THREE.Quaternion()
    const angles = new THREE.Euler(0, 0, 0, 'YXZ')
    const restingHeadPitch = THREE.MathUtils.degToRad(7)
    const entryHeadPitch = THREE.MathUtils.degToRad(-5)
    let headEntrance: Animation | undefined
    const frameInterval = 1000 / MODEL_FPS
    let frameTimer: ReturnType<typeof setTimeout> | undefined
    let unsubscribePointer: (() => void) | undefined
    let lastRender = 0
    let entranceFinished = false
    let intersecting = true
    const canRender = () => !disposed && !document.hidden && intersecting

    const draw = () => {
      frameTimer = undefined
      if (!canRender()) return
      const now = performance.now()
      const elapsed = Math.min((now - lastRender) / 1000, 0.1)
      lastRender = now
      current.lerp(target, 1 - Math.exp(-elapsed * 18))
      const moving = current.distanceToSquared(target) > 0.000001
      if (!moving) current.copy(target)
      turntable.rotation.y = current.x * THREE.MathUtils.degToRad(8)
      // 复用缩放动画的缓动进度，线框和金属姿势同步，暂停或跳帧时也不会错位。
      const bowProgress = entranceFinished
        ? 1
        : Number(headEntrance?.effect?.getComputedTiming().progress ?? 1)
      angles.set(
        THREE.MathUtils.lerp(entryHeadPitch, restingHeadPitch, bowProgress) +
          current.y * THREE.MathUtils.degToRad(18),
        current.x * THREE.MathUtils.degToRad(35),
        0,
        'YXZ'
      )
      rotation.setFromEuler(angles)
      headRotation.value.set(rotation.x, rotation.y, rotation.z, rotation.w)
      renderer.render(scene, camera)
      if (moving || !entranceFinished) scheduleDraw()
    }
    const scheduleDraw = () => {
      if (!canRender() || frameTimer !== undefined) return
      frameTimer = setTimeout(
        draw,
        Math.max(0, Math.ceil(frameInterval - (performance.now() - lastRender)))
      )
    }
    invalidate = scheduleDraw
    const followPointer = (event: PointerEvent) => {
      if (!canRender()) return
      target
        .set(
          (event.clientX / window.innerWidth - 0.5) * 2,
          (event.clientY / window.innerHeight - 0.5) * 2
        )
        .clampScalar(-1, 1)
      scheduleDraw()
    }
    const resetPointer = () => {
      target.set(0, 0)
      scheduleDraw()
    }
    const syncActivity = () => {
      if (!canRender()) {
        unsubscribePointer?.()
        unsubscribePointer = undefined
        if (frameTimer !== undefined) clearTimeout(frameTimer)
        frameTimer = undefined
      } else {
        if (entranceFinished && !unsubscribePointer)
          unsubscribePointer = subscribePointerSamples(
            followPointer,
            POINTER_SAMPLE_MS
          )
        scheduleDraw()
      }
    }
    const enablePointer = () => {
      if (disposed) return
      entranceFinished = true
      stage.value!.dataset.entranceFinished = 'true'
      syncActivity()
    }
    const viewportObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting
      syncActivity()
    })
    viewportObserver.observe(stage.value!)
    document.addEventListener('visibilitychange', syncActivity)
    document.documentElement.addEventListener('pointerleave', resetPointer)
    const disposeScene = cleanup!
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    rotation.setFromEuler(
      angles.set(reducedMotion ? restingHeadPitch : entryHeadPitch, 0, 0, 'YXZ')
    )
    headRotation.value.set(rotation.x, rotation.y, rotation.z, rotation.w)
    // 画布隐藏时预热金属着色器，切换材质时不会临时编译造成停顿。
    renderer.render(scene, camera)
    stage.value!.dataset.materialPhase = 'chrome'
    const entranceAnimations: Animation[] = []
    renderer.domElement.style.opacity = '1'
    if (!reducedMotion) {
      mesh.material = entryMaterial
      stage.value!.dataset.materialPhase = 'wireframe'
      renderer.render(scene, camera)
      const shrinkDuration = 1920
      const shrink = renderer.domElement.animate(
        [
          { transform: 'scale(2)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: shrinkDuration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
      )
      shrink.id = 'lucario-shrink-in'
      headEntrance = shrink
      scheduleDraw()
      shrink.finished
        .then(() => {
          if (disposed) return
          headEntrance = undefined
          mesh.material = chromeMaterial
          stage.value!.dataset.materialPhase = 'chrome'
          scheduleDraw()
        })
        .catch(() => {})
      const flicker = renderer.domElement.animate(
        [
          {
            offset: 0,
            opacity: 0.45,
            transform: 'translateX(0)',
            filter: 'none',
          },
          {
            offset: 0.15,
            opacity: 1,
            transform: 'translateX(-10px)',
            filter: 'hue-rotate(75deg) brightness(1.35)',
          },
          {
            offset: 0.35,
            opacity: 1,
            transform: 'translateX(8px)',
            filter: 'hue-rotate(-55deg) brightness(1.2)',
          },
          {
            offset: 0.65,
            opacity: 0.85,
            transform: 'translateX(0)',
            filter: 'none',
          },
          {
            offset: 0.85,
            opacity: 0.55,
            transform: 'translateX(0)',
            filter: 'none',
          },
          {
            offset: 1,
            opacity: 1,
            transform: 'translateX(0)',
            filter: 'none',
          },
        ].map((frame) => ({ ...frame, easing: 'steps(1, end)' })),
        {
          duration: 80,
          delay: shrinkDuration,
          iterations: 3,
          // 全局保持线性进度，阶跃仅作用于相邻关键帧，避免整轮停在第一帧。
          easing: 'linear',
        }
      )
      flicker.id = 'lucario-flicker-in'
      entranceAnimations.push(flicker, shrink)
      Promise.all(entranceAnimations.map((animation) => animation.finished))
        .then(enablePointer)
        .catch(() => {})
    } else {
      enablePointer()
    }
    cleanup = () => {
      invalidate = () => {}
      entranceAnimations.forEach((animation) => animation.cancel())
      viewportObserver.disconnect()
      document.removeEventListener('visibilitychange', syncActivity)
      document.documentElement.removeEventListener('pointerleave', resetPointer)
      unsubscribePointer?.()
      if (frameTimer !== undefined) clearTimeout(frameTimer)
      disposeScene()
    }
  } catch (error) {
    cleanup?.()
    cleanup = undefined
    if (!disposed) {
      status.value = 'error'
      console.error('路卡利欧模型加载失败', error)
    }
  }
})

onBeforeUnmount(() => {
  disposed = true
  cleanup?.()
})

onUnmounted(() => {
  setSmoothScrollLocked('island-lucario', false)
})
</script>

<template>
  <main class="lucario-page no-rem" aria-label="路卡利欧模型">
    <div ref="stage" class="lucario-stage" :aria-busy="status === 'loading'" />
    <p v-if="status === 'error'" class="lucario-status" role="alert">
      模型加载失败，请刷新页面重试
    </p>
  </main>
</template>

<style lang="less" scoped>
.lucario-page.no-rem {
  position: relative;
  width: 100%;
  height: calc(100svh - 140px);
  min-height: 360px;
  overflow: clip;
  overflow-clip-margin: 30vh;
  .lucario-stage {
    position: relative;
    width: 100%;
    height: 100%;
  }
  :deep(canvas) {
    position: absolute;
    top: calc(-1 * var(--canvas-bleed, 0px));
    left: 0;
    display: block;
    width: 100%;
    height: calc(100% + 2 * var(--canvas-bleed, 0px));
    transform-origin: 50% calc(var(--canvas-bleed) + var(--stage-height) * 0.65);
    pointer-events: none;
  }
  .lucario-status {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--text-color);
    opacity: 0.6;
    font-size: 13px;
    pointer-events: none;
  }
}
</style>
