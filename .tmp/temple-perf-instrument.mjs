export function instrument(source) {
  const optimized = source.includes('const drawScene =')
  const marker = '  return {\n    select,'
  if (!source.includes(marker)) throw new Error('Diagnostic insertion marker missing')
  source = source.replace(marker, `
  window.__templePerf = { renderer, scene, camera, target, post, postScene, blur, obelisks, reflection, statue, select, invalidate, ${optimized ? 'drawScene,' : ''}
    records: [], gpu: [], measure: false, phase: 'init',
    begin() {
      this.start = performance.now(); this.drawStart = window.__templeDraws || 0;
      const gl = renderer.getContext();
      this.ext = this.ext || gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if (this.ext) { this.query = gl.createQuery(); gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.query); }
    },
    end() {
      const gl = renderer.getContext();
      if (this.query) {
        gl.endQuery(this.ext.TIME_ELAPSED_EXT);
        this.gpu.push({query:this.query, phase:this.phase}); this.query = null;
      }
      this.records.push({phase:this.phase, time:performance.now(), cpuMs:performance.now()-this.start,
        draws:(window.__templeDraws||0)-this.drawStart, programs:renderer.info.programs.length, selected, blur:blur.value});
    },
    collect() {
      const gl = renderer.getContext(); const result = [];
      this.gpu = this.gpu.filter(item => {
        if (!gl.getQueryParameter(item.query,gl.QUERY_RESULT_AVAILABLE)) return true;
        if (!gl.getParameter(this.ext.GPU_DISJOINT_EXT)) result.push({phase:item.phase,gpuMs:gl.getQueryParameter(item.query,gl.QUERY_RESULT)/1e6});
        gl.deleteQuery(item.query); return false;
      });
      return result;
    }
  };
${marker}`)
  if (optimized) {
    source = source.replace('    drawScene();', '    const __audit = window.__templePerf; if (__audit?.measure) __audit.begin();\n    drawScene();\n    if (__audit?.measure) __audit.end();')
  } else {
  source = source.replace('    renderer.setRenderTarget(blur.value > 1e-3 ? target : null);',
    '    const __audit = window.__templePerf; if (__audit?.measure) __audit.begin();\n    renderer.setRenderTarget(blur.value > 1e-3 ? target : null);')
  source = source.replace('    projectButtons();',
    '    if (__audit?.measure) __audit.end();\n    projectButtons();')
  }
  return source
}
