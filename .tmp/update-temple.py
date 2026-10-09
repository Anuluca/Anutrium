from pathlib import Path
p=Path('src/views/Island/islandTempleScene.ts')
s=p.read_text()
s=s.replace('  renderer.toneMappingExposure = 1.05', '  renderer.toneMappingExposure = 1.05\n  renderer.localClippingEnabled = true')
s=s.replace("  stage.dataset.maxFps = '60'", "  stage.dataset.entranceFinished = 'false'\n  stage.dataset.maxFps = '60'")
s=s.replace('  let hovered: TempleCategoryId | null = null', '''  let entranceFinished = false
  let entranceActive = false
  let entranceStart = 0
  let entrance: gsap.core.Timeline | undefined
  let glitch: Animation | undefined
  const entranceDuration = 1920
  const glitchDuration = 80
  stage.dataset.entranceDuration = String(entranceDuration)
  stage.dataset.glitchDuration = String(glitchDuration)
  stage.dataset.glitchIterations = '3' ''')
start=s.index('  const key = new THREE.DirectionalLight')
end=s.index('\n  // 所有方尖碑',start)
s=s[:start]+'''  // HDR 工作室只用于雕塑；成对光源让四座柱子的左右受光保持一致。
  for (const side of [-1, 1]) {
    const key = new THREE.DirectionalLight(0xff9bb7, 0.85)
    key.position.set(side * 5, 10, 8)
    const rim = new THREE.DirectionalLight(0xe41445, 1.4)
    rim.position.set(side * 6, 6, -9)
    scene.add(key, rim)
  }
'''+s[end:]
s=s.replace('new THREE.BoxGeometry(1, 4.55, 1)', 'new THREE.BoxGeometry(1.3, 4.55, 1.3)')
s=s.replace('new THREE.ConeGeometry(0.51, 1.05, 4)', 'new THREE.ConeGeometry(0.663, 1.05, 4)')
s=s.replace('new THREE.BoxGeometry(1.45, 0.21, 1.45)', 'new THREE.BoxGeometry(1.8, 0.21, 1.8)').replace('new THREE.BoxGeometry(1.95, 0.13, 1.95)', 'new THREE.BoxGeometry(2.35, 0.13, 2.35)')
s=s.replace('  const edgeGeometry = geometry(new THREE.EdgesGeometry(bodyGeometry, 25))\n  const capEdges = geometry(new THREE.EdgesGeometry(capGeometry, 25))\n', '')
s=s.replace('new THREE.PlaneGeometry(0.68, 4.22)', 'new THREE.PlaneGeometry(0.82, 4.22)')
s=s.replace('      metalness: 0.8,\n      roughness: 0.42,\n      envMapIntensity: 0.3,', '      metalness: 0.25,\n      roughness: 0.7,\n      envMapIntensity: 0,')
start=s.index("      context.strokeStyle = '#f52856'")
end=s.index('\n    }\n    paint()',start)
s=s[:start]+s[end:]
s=s.replace('        metalness: 0.85,\n        roughness: 0.27,\n        clearcoat: 0.5,\n        envMapIntensity: 0.4,', '        metalness: 0.65,\n        roughness: 0.38,\n        clearcoat: 0.2,\n        envMapIntensity: 0,')
s=s.replace('        metalness: 0.72,\n        roughness: 0.13,', '        metalness: 0.15,\n        roughness: 0.22,').replace('        clearcoat: 1,\n        envMapIntensity: 0.65,', '        clearcoat: 0.45,\n        envMapIntensity: 0,')
start=s.index('    const edge = material(')
end=s.index('    for (const [shape, y]',start)
s=s[:start]+s[end:]
s=s.replace('label.position.set(0, 2.66, 0.434)', 'label.position.set(0, 2.66, 0.565)').replace('Math.atan(0.14 / 4.55)', 'Math.atan(0.182 / 4.55)')
s=s.replace('      edge,\n', '      core,\n')
s=s.replace('    [4.9, 0.14, 0.07],\n    [4.35, 0.18, 0.23],\n    [3.8, 0.2, 0.42],', '    [6.4, 0.14, 0.07],\n    [5.8, 0.18, 0.23],\n    [5.2, 0.2, 0.42],')
s=s.replace('      faded.depthWrite = false\n      object.material = faded', '''      faded.depthWrite = false
      if (original.clippingPlanes?.length) {
        faded.clippingPlanes = original.clippingPlanes.map((plane) =>
          new THREE.Plane(new THREE.Vector3(plane.normal.x, -plane.normal.y, plane.normal.z), plane.constant)
        )
      }
      if (original === chromeMaterial) faded.onBeforeCompile = chromeMaterial.onBeforeCompile
      object.material = faded''')
s=s.replace('vec2 stepSize=texel*amount*1.7;', 'vec2 stepSize=texel*amount*3.4;')
s=s.replace('  const headTarget = new THREE.Vector2()', '  const headTarget = new THREE.Vector2()\n  const pointerTarget = new THREE.Vector2()')
s=s.replace('      envMapIntensity: 1.8,\n', '      envMapIntensity: 1.8,\n      clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.52)],\n')
s=s.replace('    [-0.5,', '    [-0.65,').replace('    [0.5,', '    [0.65,').replace(', 0.5],', ', 0.65],').replace(', -0.5],', ', -0.65],').replace('    [-0.36,', '    [-0.468,').replace('    [0.36,', '    [0.468,').replace(', 0.36],', ', 0.468],').replace(', -0.36],', ', -0.468],')
s=s.replace('    if (transitionActive && transition) {', '''    if (entranceActive && entrance) {
      entrance.totalTime(Math.min((now - entranceStart) / 1000, entrance.duration()))
    }
    if (transitionActive && transition) {''',1)
s=s.replace('    headCurrent.lerp(headTarget, 1 - Math.exp(-elapsed * 18))\n    const moving = headCurrent.distanceToSquared(headTarget) > 0.000001\n    if (!moving) headCurrent.copy(headTarget)', '''    if (!selected && entranceFinished) headCurrent.lerp(headTarget, 1 - Math.exp(-elapsed * 18))
    const moving = !selected && entranceFinished && headCurrent.distanceToSquared(headTarget) > 0.000001
    if (!moving && !selected && entranceFinished) headCurrent.copy(headTarget)''')
s=s.replace('      item.surface.envMapIntensity = 0.4 * dim\n      item.crystal.envMapIntensity = 0.65 * dim\n', '')
start=s.index('      item.edge.opacity =')
end=s.index('      item.labelMaterial',start)
s=s[:start]+'''      ;(item.core.material as THREE.MeshBasicMaterial).opacity = 0.24 * dim
'''+s[end:]
s=s.replace('    renderer.setRenderTarget(blur.value', "    document.body.style.setProperty('--island-zodiac-blur', `${(blur.value * 4).toFixed(3)}px`)\n    stage.dataset.headRotation = headRotation.value.toArray().map((value) => value.toFixed(6)).join(',')\n    renderer.setRenderTarget(blur.value",1)
s=s.replace('    if (moving || transitionActive) invalidate()', '    if (moving || transitionActive || entranceActive) invalidate()')
s=s.replace('    if (!selected && !transitionActive) camera.position.copy(homePosition)', '    if (!selected && !transitionActive && !entranceActive) camera.position.copy(homePosition)')
s=s.replace('  const select = (id: TempleCategoryId) => {\n    if (!ready || disposed) return\n    selected = selected === id ? null : id', '''  const select = (id: TempleCategoryId | null) => {
    if (!ready || !entranceFinished || disposed) return
    const next = selected === id ? null : id
    if (next === selected) return
    if (!selected && next) headTarget.copy(headCurrent)
    selected = next
    if (!selected) headTarget.copy(pointerTarget)''')
start=s.index('      // 朝选中碑外侧移轨')
end=s.index('\n    }\n    transition.to(',start)
s=s[:start]+'''      const outer = Math.abs(item.category.x) > 5
      // 外侧柱只推进原来距离的一半；水平偏航和俯仰角均减半。
      const distance = outer ? (homePosition.z - item.category.z + 4.8) * 0.5 : 4.8
      const yaw = Math.atan2(8.8, 12.8) * 0.5
      const pitch = Math.atan2(5.5, Math.hypot(8.8, 12.8)) * 0.5
      destination = new THREE.Vector3(
        item.category.x - side * distance * Math.tan(THREE.MathUtils.degToRad(13)),
        outer ? 1.1 : 0.9,
        item.category.z + distance
      )
      aim = destination.clone().add(new THREE.Vector3(
        -side * Math.sin(yaw) * 15.5,
        Math.tan(pitch) * 15.5,
        -Math.cos(yaw) * 15.5
      ))'''+s[end:]
s=s.replace('    if (id) select(id)', '    if (id) select(id)\n    else if (selected) select(null)')
s=s.replace('    headTarget\n      .set(', '    pointerTarget\n      .set(')
s=s.replace('    hovered = raycast(event) || null\n    invalidate()', '    if (!selected && entranceFinished) { headTarget.copy(pointerTarget); invalidate() }')
s=s.replace('      hiddenAt = performance.now()', '      hiddenAt = performance.now()\n      glitch?.pause()')
s=s.replace('      if (ready && !unsubscribe)', '      if (ready && entranceFinished && !unsubscribe)')
s=s.replace('      hiddenAt = 0\n      invalidate()', '''      if (hiddenAt && entranceActive) entranceStart += performance.now() - hiddenAt
      if (hiddenAt) glitch?.play()
      hiddenAt = 0
      invalidate()''')
s=s.replace('    headTarget.set(0, 0)\n    hovered = null\n    invalidate()', '    pointerTarget.set(0, 0)\n    if (!selected && entranceFinished) { headTarget.copy(pointerTarget); invalidate() }')
s=s.replace('      scene.environment = environmentTexture', '      chromeMaterial.envMap = environmentTexture')
s=s.replace('      statue.scale.setScalar(6.7 / metadata.size[1])', '''      // 线性尺寸为原模型的 2 倍；在大腿根部裁切，断面落在现有台座顶面。
      const modelScale = 13.4 / metadata.size[1]
      statue.scale.setScalar(modelScale)
      statue.position.y = 0.52 - (1.1 - metadata.center[1]) * modelScale
      stage.dataset.modelScale = String(modelScale)
      stage.dataset.modelCropY = '1.1' ''')
start=s.index("      stage.dataset.materialPhase = 'chrome'")
end=s.index('\n    })\n    .catch',start)
s=s[:start]+'''      const finishEntrance = () => {
        if (disposed) return
        entranceFinished = true
        stage.dataset.entranceFinished = 'true'
        callbacks.entranceFinished()
        syncActivity()
      }
      const wire = material(new THREE.MeshBasicMaterial({ color: 0xe23456, wireframe: true, toneMapped: false }))
      const modelWire = material(wire.clone())
      modelWire.clippingPlanes = chromeMaterial.clippingPlanes
      modelWire.onBeforeCompile = chromeMaterial.onBeforeCompile
      const originals: Array<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[]; visible: boolean }> = []
      renderer.domElement.style.opacity = '0'
      camera.lookAt(lookAt)
      renderer.compile(scene, camera)
      if (!reducedMotion) {
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          const original = object.material as THREE.Material
          originals.push({ mesh: object, material: object.material, visible: object.visible })
          if (original instanceof THREE.ShaderMaterial || (original instanceof THREE.MeshBasicMaterial && original.map)) object.visible = false
          else object.material = original === chromeMaterial ? modelWire : wire
        })
        reflection.visible = false
        camera.position.set(0, 0.12, homePosition.z)
        lookAt.set(0, 0.1, homeTarget.z)
        stage.dataset.materialPhase = 'wireframe'
        stage.dataset.entryCameraFrom = camera.position.toArray().join(',')
        entranceActive = true
        entranceStart = performance.now()
        entrance = gsap.timeline({ paused: true, onUpdate: invalidate, onComplete: () => {
          entranceActive = false
          originals.forEach(({ mesh, material, visible }) => { mesh.material = material; mesh.visible = visible })
          reflection.visible = true
          stage.dataset.materialPhase = 'chrome'
          invalidate()
        } })
        entrance.to(camera.position, { y: homePosition.y, duration: entranceDuration / 1000, ease: 'power2.inOut' }, 0)
          .to(lookAt, { y: homeTarget.y, duration: entranceDuration / 1000, ease: 'power2.inOut' }, 0)
        glitch = renderer.domElement.animate([
          { offset: 0, opacity: 0.45, transform: 'translateX(0)', filter: 'none' },
          { offset: 0.15, opacity: 1, transform: 'translateX(-10px)', filter: 'hue-rotate(75deg) brightness(1.35)' },
          { offset: 0.35, opacity: 1, transform: 'translateX(8px)', filter: 'hue-rotate(-55deg) brightness(1.2)' },
          { offset: 0.65, opacity: 0.85, transform: 'translateX(0)', filter: 'none' },
          { offset: 0.85, opacity: 0.55, transform: 'translateX(0)', filter: 'none' },
          { offset: 1, opacity: 1, transform: 'translateX(0)', filter: 'none' },
        ].map((frame) => ({ ...frame, easing: 'steps(1, end)' })), {
          duration: glitchDuration, delay: entranceDuration, iterations: 3, easing: 'linear',
        })
        glitch.id = 'lucario-flicker-in'
        glitch.finished.then(finishEntrance).catch(() => {})
      } else {
        stage.dataset.materialPhase = 'chrome'
        finishEntrance()
      }
      renderer.domElement.style.opacity = '1'
      ready = true
      callbacks.ready()
      syncActivity()'''+s[end:]
s=s.replace('  ready: () => void\n', '  ready: () => void\n  entranceFinished: () => void\n')
s=s.replace('      transition?.kill()\n      unsubscribe?.()', '      transition?.kill()\n      entrance?.kill()\n      glitch?.cancel()\n      document.body.style.removeProperty(\'--island-zodiac-blur\')\n      unsubscribe?.()')
p.write_text(s)
p=Path('src/views/Island/templeCategories.ts')
s=p.read_text().replace('x: -3.5,','x: -4.5,').replace('x: 3.5,','x: 4.5,')
p.write_text(s)
p=Path('src/views/Island/TempleHarbor.vue')
s=p.read_text().replace("const settled = ref(false)", "const settled = ref(false)\nconst entranceFinished = ref(false)")
s=s.replace('      select: (id) => {', '      entranceFinished: () => { entranceFinished.value = true },\n      select: (id) => {')
s=s.replace(':disabled="status !== \'ready\'"', ':disabled="status !== \'ready\' || !entranceFinished"')
p.write_text(s)
p=Path('src/views/Island/TempleHarbor.less')
s=p.read_text()+'''\n:global(body:has(.temple-page) .star-container .zodiac-stage) {
  filter: blur(var(--island-zodiac-blur, 0px));
}
'''
p.write_text(s)
