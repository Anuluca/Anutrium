/** 仅传递数值构图快照；拍照场景不持有 Atrium 的相机、模型或 GPU 资源。 */
export interface AtriumPhotoFraming {
  camera: {
    position: number[]
    quaternion: number[]
    fov: number
    near: number
    far: number
    zoom: number
    offset: { x: number; y: number; width: number; height: number }
  }
  model: { position: number[]; scale: number[] }
}
