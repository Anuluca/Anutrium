from pathlib import Path
p=Path('src/views/Island/islandTempleScene.ts')
s=p.read_text()
s=s.replace('  renderer.toneMappingExposure = 1.05', '  renderer.toneMappingExposure = 1.05\n  renderer.localClippingEnabled = true')
s=s.replace('new THREE.BoxGeometry(1, 4.55, 1)', 'new THREE.BoxGeometry(1.3, 4.55, 1.3)')
s=s.replace('new THREE.ConeGeometry(0.51, 1.05, 4)', 'new THREE.ConeGeometry(0.663, 1.05, 4)')
s=s.replace('new THREE.BoxGeometry(1.45, 0.21, 1.45)', 'new THREE.BoxGeometry(1.8, 0.21, 1.8)')
s=s.replace('new THREE.BoxGeometry(1.95, 0.13, 1.95)', 'new THREE.BoxGeometry(2.35, 0.13, 2.35)')
s=s.replace('new THREE.PlaneGeometry(0.68, 4.22)', 'new THREE.PlaneGeometry(0.82, 4.22)')
start=s.index("      context.strokeStyle = '#f52856'")
end=s.index('\n    }\n    paint()',start)
s=s[:start]+s[end:]
s=s.replace('label.position.set(0, 2.66, 0.434)', 'label.position.set(0, 2.66, 0.565)').replace('Math.atan(0.14 / 4.55)', 'Math.atan(0.182 / 4.55)')
s=s.replace('      strength: 0,', '      strength: 0,\n      hoverStrength: 0,')
s=s.replace('    [4.9, 0.14, 0.07],\n    [4.35, 0.18, 0.23],\n    [3.8, 0.2, 0.42],', '    [6.4, 0.14, 0.07],\n    [5.8, 0.18, 0.23],\n    [5.2, 0.2, 0.42],')
s=s.replace('      faded.depthWrite = false\n      object.material = faded', '''      faded.depthWrite = false
      // 反射副本在地面下保留同一段半身，并共享原模型的头部形变。
      if (original.clippingPlanes?.length) {
        faded.clippingPlanes = original.clippingPlanes.map((plane) =>
          new THREE.Plane(new THREE.Vector3(plane.normal.x, -plane.normal.y, plane.normal.z), plane.constant)
        )
        faded.onBeforeCompile = original.onBeforeCompile
      }
      object.material = faded''')
s=s.replace('vec2 stepSize=texel*amount*1.7;', 'vec2 stepSize=texel*amount*3.4;')
s=s.replace('  const headTarget = new THREE.Vector2()', '  const headTarget = new THREE.Vector2()\n  const pointerTarget = new THREE.Vector2()')
s=s.replace('      envMapIntensity: 1.8,\n', '      envMapIntensity: 1.8,\n      clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.52)],\n')
s=s.replace('    [-0.5,', '    [-0.65,').replace('    [0.5,', '    [0.65,').replace(', 0.5],', ', 0.65],').replace(', -0.5],', ', -0.65],').replace('    [-0.36,', '    [-0.468,').replace('    [0.36,', '    [0.468,').replace(', 0.36],', ', 0.468],').replace(', -0.36],', ', -0.468],')
s=s.replace('    headCurrent.lerp(headTarget, 1 - Math.exp(-elapsed * 18))\n    const moving = headCurrent.distanceToSquared(headTarget) > 0.000001\n    if (!moving) headCurrent.copy(headTarget)', '''    if (!selected) headCurrent.lerp(headTarget, 1 - Math.exp(-elapsed * 18))
    const moving = !selected && headCurrent.distanceToSquared(headTarget) > 0.000001
    if (!moving && !selected) headCurrent.copy(headTarget)''')
s=s.replace('    for (const item of obelisks) {\n      const dim', '''    let hoverMoving = false
    for (const item of obelisks) {
      const hoverTarget = hovered === item.category.id ? 1 : 0
      item.hoverStrength = THREE.MathUtils.damp(item.hoverStrength, hoverTarget, 18, elapsed)
      if (Math.abs(item.hoverStrength - hoverTarget) > 0.001) hoverMoving = true
      else item.hoverStrength = hoverTarget
      const dim''')
s=s.replace('      item.beamMaterial.uniforms.intensity.value = item.strength\n      item.poolMaterial.opacity = item.strength * 0.8\n      item.spot.intensity = item.strength * 55', '''      // 悬停和聚焦共用顶部圣光；强度为原聚焦光的 50%，不叠加两份光源。
      const illumination = Math.max(item.strength, item.hoverStrength) * 0.5
      item.beamMaterial.uniforms.intensity.value = illumination
      item.poolMaterial.opacity = illumination * 0.8
      item.spot.intensity = illumination * 55
      item.spot.position.set(item.group.position.x, 12, item.group.position.z + 0.6)
      item.spot.target.position.set(item.group.position.x, 1, item.group.position.z)''')
s=s.replace('    renderer.setRenderTarget(blur.value', '''    document.body.style.setProperty('--island-zodiac-blur', `${(blur.value * 4).toFixed(3)}px`)
    stage.dataset.headRotation = headRotation.value.toArray().map(value => value.toFixed(6)).join(',')
    stage.dataset.hovered = hovered || 'none'
    stage.dataset.topLight = obelisks.map(item => item.beamMaterial.uniforms.intensity.value.toFixed(3)).join(',')
    renderer.setRenderTarget(blur.value''',1)
s=s.replace('    if (moving || transitionActive) invalidate()', '    if (moving || transitionActive || hoverMoving) invalidate()')
s=s.replace('  const select = (id: TempleCategoryId) => {\n    if (!ready || disposed) return\n    selected = selected === id ? null : id', '''  const select = (id: TempleCategoryId | null) => {
    if (!ready || disposed) return
    const next = selected === id ? null : id
    if (next === selected) return
    // 聚焦时保留最后实际绘制的姿势；退出后向最新指针位置平滑恢复跟随。
    if (!selected && next) headTarget.copy(headCurrent)
    selected = next
    if (!selected) headTarget.copy(pointerTarget)''')
start=s.index('      // 朝选中碑外侧移轨')
end=s.index('\n    }\n    transition.to(',start)
s=s[:start]+'''      const outer = Math.abs(item.category.x) > 5
      // 外侧柱只推进原距离的一半，偏航与仰角也减半，给内侧柱留出可见空间。
      const distance = outer ? (homePosition.z - item.category.z + 4.8) * 0.5 : 4.8
      const yaw = Math.atan2(8.8, 12.8) * 0.5
      const pitch = Math.atan2(5.5, Math.hypot(8.8, 12.8)) * 0.5
      destination = new THREE.Vector3(
        item.category.x - side * distance * Math.tan(THREE.MathUtils.degToRad(13)),
        outer ? 1.1 : 1.25,
        item.category.z + distance
      )
      aim = destination.clone().add(new THREE.Vector3(
        -side * Math.sin(yaw) * 15.5,
        Math.tan(pitch) * 15.5,
        -Math.cos(yaw) * 15.5
      ))'''+s[end:]
s=s.replace('fov: item ? 78 : 38,', 'fov: item ? (Math.abs(item.category.x) > 5 ? 54 : 78) : 38,')
s=s.replace('''            item && outer && opposite
              ? Math.sign(obelisk.category.x) * 7.8
              : obelisk.category.x,''','''            item && outer && obelisk !== item
              ? Math.sign(obelisk.category.x) * (opposite ? 7.8 : 9.4)
              : obelisk.category.x,''')
s=s.replace('    if (id) select(id)', '    if (id) select(id)\n    else if (selected) select(null)')
s=s.replace('    headTarget\n      .set(', '    pointerTarget\n      .set(')
s=s.replace('    hovered = raycast(event) || null\n    invalidate()', '''    const nextHover = raycast(event) || null
    const hoverChanged = hovered !== nextHover
    hovered = nextHover
    if (!selected) headTarget.copy(pointerTarget)
    if (!selected || hoverChanged) invalidate()''')
s=s.replace('    headTarget.set(0, 0)\n    hovered = null\n    invalidate()', '''    pointerTarget.set(0, 0)
    if (!selected) headTarget.copy(pointerTarget)
    hovered = null
    invalidate()''')
s=s.replace('      statue.scale.setScalar(6.7 / metadata.size[1])', '''      // 线性尺寸放大为原来的 2 倍，原模型坐标 y=1.1 处位于大腿根部。
      const modelScale = (6.7 * 2) / metadata.size[1]
      statue.scale.setScalar(modelScale)
      statue.position.y = 0.52 - (1.1 - metadata.center[1]) * modelScale''')
s=s.replace('      transition?.kill()\n      unsubscribe?.()', "      transition?.kill()\n      document.body.style.removeProperty('--island-zodiac-blur')\n      unsubscribe?.()")
p.write_text(s)
p=Path('src/views/Island/templeCategories.ts')
s=p.read_text().replace('x: -3.5,','x: -4.5,').replace('x: 3.5,','x: 4.5,')
p.write_text(s)
p=Path('src/views/Island/TempleHarbor.vue')
s=p.read_text().replace('select: (id: TempleCategoryId) => void', 'select: (id: TempleCategoryId | null) => void')
s=s.replace('const setButton =', '''const dismissMenuBackground = (event: MouseEvent) => {
  if (event.target instanceof Element && !event.target.closest('.temple-menu-item')) scene?.select(null)
}

const setButton =''')
s=s.replace(':inert="!settled || undefined"', ':inert="!settled || undefined"\n        @click="dismissMenuBackground"')
p.write_text(s)
p=Path('src/views/Island/TempleHarbor.less')
s=p.read_text()+'''\n:global(body:has(.temple-page) .star-container .zodiac-stage) {
  filter: blur(var(--island-zodiac-blur, 0px));
}
'''
p.write_text(s)
