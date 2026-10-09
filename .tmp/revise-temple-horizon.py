from pathlib import Path
p=Path('src/views/Island/templeCategories.ts')
s=p.read_text().replace('z: -2.6,', 'z: -7.2,')
p.write_text(s)
p=Path('src/views/Island/islandTempleScene.ts')
s=p.read_text().replace('    group.position.set(category.x, 0, category.z)', '''    group.position.set(category.x, 0, category.z)
    group.rotation.y = -Math.sign(category.x) * THREE.MathUtils.degToRad(8)''')
s=s.replace('  const floor = new THREE.Mesh(', '''  // 地面与远处光幕共用清晰的边界；沿镜头水平朝向排列，保证地平线无倾斜。
  const ground = new THREE.Group()
  scene.add(ground)
  const horizonZ = -40
  const floor = new THREE.Mesh(''')
s=s.replace('geometry(new THREE.PlaneGeometry(180, 180))', 'geometry(new THREE.PlaneGeometry(240, 160))')
s=s.replace('        float fade=1.-smoothstep(24.,65.,distance(world,cameraPosition));\n', '')
s=s.replace('fade*0.78);', '0.78);')
s=s.replace('''  floor.position.y = -0.012
  floor.renderOrder = 1
  scene.add(floor)''','''  floor.position.set(0, -0.012, horizonZ + 80)
  floor.renderOrder = 1
  ground.add(floor)
  const horizonGlow = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(240, 9)),
    material(new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color('#E23455') } },
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vUv;uniform vec3 glowColor;void main(){
        float rise=exp(-vUv.y*5.)*(1.-smoothstep(0.7,1.,vUv.y));
        gl_FragColor=vec4(glowColor,rise*0.34);
        #include <colorspace_fragment>
      }`,
    }))
  )
  horizonGlow.position.set(0, 4.5 - 0.012, horizonZ)
  horizonGlow.renderOrder = -1
  ground.add(horizonGlow)''')
s=s.replace('float amount=smoothstep(1.5,9.,abs(distance-focus))*blur;', '''// 未写入深度的地面、地平线光幕保持清晰；建筑依然使用景深。
        float amount=d>0.99999?0.:smoothstep(1.5,9.,abs(distance-focus))*blur;''')
s=s.replace('''          .set(x + item.group.position.x, y, z + item.group.position.z)
          .project(camera)''','''          .set(x, y, z)
          .applyMatrix4(item.group.matrixWorld)
          .project(camera)''')
s=s.replace("        zIndex: String(\n          Math.round(100 - camera.position.distanceTo(item.group.position))\n        ),", "        zIndex: String(\n          Math.round(100 - camera.position.distanceTo(item.group.position))\n        ),")
s=s.replace('''    camera.updateMatrixWorld()
    // 运镜期间''', '''    camera.updateMatrixWorld()
    ground.rotation.y = Math.atan2(camera.position.x - lookAt.x, camera.position.z - lookAt.z)
    monuments.updateMatrixWorld(true)
    // 运镜期间''')
s=s.replace('''    stage.dataset.headRotation = headRotation.value''','''    stage.dataset.statueZ = String(statue.position.z)
    stage.dataset.monumentZ = obelisks.map(item => item.group.position.z.toFixed(3)).join(',')
    stage.dataset.monumentYaw = obelisks.map(item => THREE.MathUtils.radToDeg(item.group.rotation.y).toFixed(1)).join(',')
    stage.dataset.headRotation = headRotation.value''')
s=s.replace('        : 7.2\n      const yaw', '        : 12.4\n      const yaw')
s=s.replace('        outer ? 1.1 : 1.25,', '        outer ? 1.1 : 2,')
s=s.replace('''              : item && obelisk !== item
              ? outer && !opposite
                ? -9
                : -5.6
              : obelisk.category.z,''', '''              : item && obelisk !== item
              ? outer
                ? opposite ? -5.6 : -9
                : -8
              : obelisk.category.z,''')
p.write_text(s)
