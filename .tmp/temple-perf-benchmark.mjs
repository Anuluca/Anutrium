export async function benchmarkTemple() {
  const a = window.__templePerf
  const gl = a.renderer.getContext()
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')
  const summarize = values => {
    const sorted = values.slice().sort((x, y) => x - y)
    return {mean: values.reduce((x, y) => x + y, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)]}
  }
  const draw = post => {
    a.renderer.setRenderTarget(post ? a.target : null)
    a.renderer.render(a.scene, a.camera)
    if (post) {
      a.renderer.setRenderTarget(null)
      a.renderer.render(a.postScene, new (a.camera.constructor)(38, 1, .1, 100))
    }
  }
  const originalVisibility = new Map()
  a.scene.traverse(object => originalVisibility.set(object, object.visible))
  const width = a.renderer.domElement.width
  const height = a.renderer.domElement.height
  const measure = async (label, post, resolution = 1, hideReflection = false, hideInactiveBeams = false) => {
    a.scene.traverse(object => { object.visible = originalVisibility.get(object) })
    a.reflection.visible = !hideReflection
    if (hideInactiveBeams) a.obelisks.forEach(item => {
      if (item.strength > .001) return
      item.group.traverse(object => {
        if (object.material === item.beamMaterial) object.visible = false
      })
    })
    a.target.setSize(Math.floor(width * resolution), Math.floor(height * resolution))
    a.post.uniforms.texel.value.set(1 / a.target.width, 1 / a.target.height)
    for (let i = 0; i < 4; i++) { draw(post); await new Promise(requestAnimationFrame) }
    const cpu = [], queries = [], calls = []
    for (let i = 0; i < 30; i++) {
      await new Promise(requestAnimationFrame)
      const start = performance.now(), previous = window.__templeDraws
      const query = gl.createQuery()
      gl.beginQuery(ext.TIME_ELAPSED_EXT, query)
      draw(post)
      gl.endQuery(ext.TIME_ELAPSED_EXT)
      cpu.push(performance.now() - start)
      calls.push(window.__templeDraws - previous)
      queries.push(query)
    }
    await new Promise(resolve => setTimeout(resolve, 120))
    const gpu = queries.filter(q => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))
      .map(q => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6)
    queries.forEach(q => gl.deleteQuery(q))
    return {label, gpu: summarize(gpu), cpu: summarize(cpu), drawCalls: summarize(calls), pixels: width * height}
  }
  const results = []
  for (const config of [
    ['full', true], ['no-dof', false], ['half-scene-target', true, .5],
    ['no-reflection', true, 1, true], ['hide-inactive-beams', true, 1, false, true],
    ['full-repeat', true],
  ]) results.push(await measure(...config))
  a.scene.traverse(object => { object.visible = originalVisibility.get(object) })
  a.target.setSize(width, height)
  a.post.uniforms.texel.value.set(1 / width, 1 / height)
  a.invalidate()
  return results
}
