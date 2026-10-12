// 兼容普通静态服务器和已通过 Content-Encoding 自动解压的服务器。
export async function readCompressedModelBuffer(response: Response) {
  const buffer = await response.arrayBuffer()
  const signature = new Uint8Array(buffer)
  if (signature[0] !== 0x1f || signature[1] !== 0x8b) return buffer
  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}
