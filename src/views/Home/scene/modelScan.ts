import * as THREE from 'three'

/** 物理表面与合成表面共享变形后的模型空间分界，动画只改变 uniform。 */
export function createModelScan(
  color: THREE.Color,
  referenceHeight = 4.27876255
) {
  const progress = { value: 0 }
  const bounds = { value: new THREE.Vector2(0, 1) }
  const flowTime = { value: 0 }
  const flowEnabled = { value: 1 }
  const uniforms = {
    islandScanProgress: progress,
    islandScanBounds: bounds,
    islandFlowTime: flowTime,
    islandFlowEnabled: flowEnabled,
    islandFlowReferenceHeight: { value: referenceHeight },
  }
  const install = (material: THREE.Material, layer: 'chrome' | 'composite') => {
    const previousCompile = material.onBeforeCompile
    const previousKey = material.customProgramCacheKey()
    material.onBeforeCompile = (shader, renderer) => {
      previousCompile.call(material, shader, renderer)
      Object.assign(shader.uniforms, uniforms, {
        islandScanColor: { value: color },
      })
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 islandScanPosition; uniform vec2 islandScanBounds; uniform float islandScanProgress;
          ${
            layer === 'composite'
              ? 'attribute vec3 barycentric; varying vec3 islandBarycentric; varying vec3 islandFlowPhase; uniform float islandFlowReferenceHeight; uniform float islandFlowTime; uniform float islandFlowEnabled;'
              : ''
          }`
        )
        .replace(
          '#include <project_vertex>',
          `
          ${layer === 'composite' ? 'islandBarycentric = barycentric;' : ''}
          islandScanPosition = vec3(0.0);
          if (islandScanProgress > 0.00001 && islandScanProgress < 0.99999)
            islandScanPosition = vec3(transformed.x, transformed.y - islandScanBounds.x, transformed.z) / islandScanBounds.y;
          #include <project_vertex>
          ${
            layer === 'composite'
              ? // 原站 cat.glb POSITION.y 范围 × 桌面 _catScale(4.5) = 4.27876255。
                `islandFlowPhase = vec3(0.0);
                if (islandFlowEnabled > 0.5) {
                  vec2 flowView = mvPosition.xy * (islandFlowReferenceHeight / max(islandScanBounds.y * length(modelMatrix[1].xyz), 0.00001));
                  islandFlowPhase = vec3(flowView.y * 2.0, flowView.x * 1.5, (flowView.x + flowView.y) * 1.75) + islandFlowTime * vec3(-0.3, 0.25, -0.35);
                }`
              : ''
          }`
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 islandScanPosition;
          uniform float islandScanProgress; uniform vec3 islandScanColor;
          ${
            layer === 'composite'
              ? 'varying vec3 islandBarycentric; varying vec3 islandFlowPhase; uniform float islandFlowEnabled;'
              : ''
          }
          float islandScanHash(vec2 p) { return fract(sin(dot(p, vec2(53.37, 117.13))) * 15837.31); }
          float islandScanNoise(vec2 p) {
            vec2 cell = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(islandScanHash(cell), islandScanHash(cell + vec2(1., 0.)), f.x),
              mix(islandScanHash(cell + vec2(0., 1.)), islandScanHash(cell + vec2(1.)), f.x), f.y);
          }`
        )
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
          ${layer === 'chrome' ? 'if (islandScanProgress > 0.00001) {' : ''}
          float scanActive = step(0.00001, islandScanProgress) * (1.0 - step(0.99999, islandScanProgress));
          float scanFront = mix(-0.12, 1.12, islandScanProgress);
          float scanNoise = 0.5;
          if (scanActive > 0.5) scanNoise = islandScanNoise(islandScanPosition.xz * 24.0 + vec2(islandScanProgress * 9.0, 0.0));
          float scanDistance = islandScanPosition.y - scanFront + (scanNoise - 0.5) * 0.025 * scanActive;
          ${
            layer === 'chrome'
              ? 'if (islandScanProgress >= 0.99999 || (scanActive > 0.5 && scanDistance < 0.0)) discard;'
              : 'if (islandScanProgress <= 0.00001 || (scanDistance >= 0.13 && islandScanProgress < 0.99999)) discard;'
          }
          ${layer === 'chrome' ? '}' : ''}
        `
        )
      if (layer === 'composite') {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <opaque_fragment>',
            `
            vec3 pixelDistance = islandBarycentric / max(fwidth(islandBarycentric), vec3(0.00001));
            float wireDistance = min(min(pixelDistance.x, pixelDistance.y), pixelDistance.z);
            float wireCoverage = 1.0 - smoothstep(0.55, 1.25, wireDistance);
            float converted = (islandScanProgress >= 0.99999 || scanDistance < 0.0) ? 1.0 : 0.0;
            diffuseColor.a = converted * (0.55 + 0.45 * wireCoverage);
            outgoingLight = vec3(0.0);
            vec3 scanRadiance = vec3(0.0);
            float scanAlpha = 0.0;
            // 来源：yutaabe.com 的 tn 片元着色器 travel1/2/3、pulse1/2/3。
            // 三组窄脉冲在视空间交叉移动，最终乘线条遮罩，面内不产生扫光或光晕。
            vec3 flowRadiance = vec3(0.0);
            if (islandFlowEnabled > 0.5 && wireCoverage > 0.0 && converted > 0.0) {
              // 仿射相位在顶点计算；fract 留在片元，避免跨周期的插值接缝。
              vec3 pulse = max(vec3(1.0) - abs(fract(islandFlowPhase) - 0.5) * 0.75, vec3(0.0));
              // x^12 = (x^4)^3，复用乘积，替代三组重复的通用 pow。
              pulse *= pulse;
              vec3 pulse4 = pulse * pulse;
              pulse = pulse4 * pulse4 * pulse4;
              float travelLight = dot(pulse, vec3(1.0, 0.7, 0.5)) * wireCoverage;
              flowRadiance = vec3(0.93267, 0.36351, 0.52857) * travelLight;
            }
            if (scanActive > 0.5) {
              float scanCore = exp(-abs(scanDistance) * 300.0);
              float scanHalo = exp(-abs(scanDistance) * 48.0);
              float scanSpark = pow(scanNoise, 9.0) * exp(-abs(scanDistance) * 90.0);
              scanRadiance = islandScanColor * (scanHalo * 1.7 + scanSpark * 5.0) + vec3(1.0, 0.9, 0.94) * scanCore * 2.0;
              scanAlpha = clamp(scanHalo * 0.75 + scanCore + scanSpark, 0.0, 1.0);
            }
            #include <opaque_fragment>`
          )
          .replace(
            '#include <premultiplied_alpha_fragment>',
            `#include <premultiplied_alpha_fragment>
            // 显示色彩空间中按覆盖率合成，保持黑色 0.55 填充与原线框的叠加语义。
            gl_FragColor.rgb += linearToOutputTexel(vec4(islandScanColor, 1.0)).rgb * 0.55 * wireCoverage * converted;
            gl_FragColor.rgb += flowRadiance * converted;
            if (scanActive > 0.5) gl_FragColor.rgb += linearToOutputTexel(vec4(scanRadiance, 1.0)).rgb * scanAlpha;`
          )
      }
    }
    material.customProgramCacheKey = () =>
      `${previousKey}:island-scan-flow-v17-${layer}`
  }
  return {
    progress,
    bounds,
    flowTime,
    flowEnabled,
    install,
    advanceFlow(elapsed: number) {
      // 三组速度的共同周期为 20 秒；限制时钟范围，避免长期开页导致浮点精度退化。
      flowTime.value = (flowTime.value + Math.min(elapsed, 0.05)) % 20
    },
  }
}
