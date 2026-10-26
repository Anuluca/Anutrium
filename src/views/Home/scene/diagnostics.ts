/** 场景创建时读取一次；开发访问也默认关闭，测试通过初始化脚本显式开启。 */
export function isHomeSceneDiagnosticsEnabled(): boolean {
  if (
    typeof window !== 'undefined' &&
    typeof window.__ANUTRIUM_HOME_DIAGNOSTICS__ === 'boolean'
  )
    return window.__ANUTRIUM_HOME_DIAGNOSTICS__

  return import.meta.env.VITE_HOME_SCENE_DIAGNOSTICS === 'true'
}
