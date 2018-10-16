interface IBufferMap { [s: string]: ArrayBuffer; }

class GLTFContainer {
  constructor(public json: GLTF.IGLTF, public resources: IBufferMap) {}
  resolveURI(uri: string): ArrayBuffer {
    return this.resources[uri];
  }
}

export { GLTFContainer, IBufferMap };
