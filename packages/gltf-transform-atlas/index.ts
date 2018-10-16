import * as atlaspack from 'atlaspack';

const DEFAULTS = {
  maxSize: 2048
};

class GLTFAtlasPack {
  constructor () {
    throw new Error('GLTFAtlasPack is a static class — do not instantiate.');
  }

  pack ( files, options ) {
    options = Object.assign( {}, DEFAULTS, options );

    if (files.size > 1) {
      throw new Error('Only embedded .gltf models currently implemented.');
    }

    const [name, file] = Array.from(files)[0];

  }
}

const aoTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 255, 0);
  grd.addColorStop(0, '#000');
  grd.addColorStop(1, '#fff');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 1);
  document.body.appendChild(canvas);
  return new THREE.CanvasTexture(canvas);
})();

const dropEl = document.querySelector('#dropzone');
const inputEl = document.querySelector('#input');
const resolutionEl = document.querySelector('#resolution');
const samplesEl = document.querySelector('#samples');
const dropzone = new SimpleDropzone(dropEl, inputEl);
dropzone.on('drop', ({files}) => {

  const [name, file] = Array.from(files)[0];

  const loader = new THREE.GLTFLoader();
  loader.load(URL.createObjectURL(file), (gltf) => {

    const mesh = gltf.scene.children[0];
    const attributes = mesh.geometry.attributes;
    const position = attributes.position.array;
    const cells = (mesh.geometry.index||{}).array;
    const resolution = Number(resolutionEl.value);
    const samples = Number(samplesEl.value);
    console.log(`Resolution: ${resolution}; Samples: ${samples}`);

    // Bake vertex AO.
    const aoSampler = geoao(position, {cells, resolution});
    for (let i = 0; i < samples; i++) aoSampler.sample();
    const ao = aoSampler.report();
    aoSampler.dispose();

    // Write UV set and add AO map.
    const numVertices = ao.length;
    const uv2Data = new Float32Array(numVertices * 2);
    for (let i = 0; i < numVertices; i++) {
      uv2Data[i * 2] = uv2Data[i * 2 + 1] = 1 - ao[i];
    }
    const uv2 = new THREE.BufferAttribute(uv2Data, 2);
    mesh.geometry.addAttribute('uv2', uv2);
    mesh.material.aoMap = aoTexture;

    // Export.
    var exporter = new THREE.GLTFExporter();
    exporter.parse(mesh, ( content ) => {
      const baseURL = THREE.LoaderUtils.extractUrlBase(name);
      const filename = 'baked_' + name.replace(baseURL, '');
      save(new Blob([JSON.stringify(content)], {type: 'text/plain'}), filename);
    });

  }, undefined, (e) => console.error(e));

});


