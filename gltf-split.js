#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const program = require('commander');
const splice = require('buffer-splice');

function list(val) {
  return val.split(',');
}

program
  .version('0.0.1')
  .usage('[options] <file>')
  .option('-o, --output <file>', 'output filename', String)
  .option('-p, --prettyprint', 'prettyprint JSON')
  .option('-m, --meshes <meshes>', 'comma-delimited mesh names to separate', list)
  .parse(process.argv);

const inputPath = program.args[0];
if (!inputPath) { program.help(); }
if (!inputPath.match(/\.gltf$/)) {
  throw new Error('Only `.gltf` files are currently supported.');
}

if (!program.output) {
  program.help();
}

if (!program.meshes) {
  program.help();
}

console.log(' → input: %j', program.args);
console.log(' → output: %j', program.output);
console.log(' → meshes: %j', program.meshes);
console.log(' → prettyprint: %j', program.prettyprint);

const outputDirectory = path.dirname(path.resolve(program.output));

console.log(`Loading "${inputPath}, writing to ${outputDirectory}."`);

const json = JSON.parse( fs.readFileSync(inputPath, 'utf8') );

// Create Buffer instances.
json.buffers.forEach((buffer, bufferIndex) => {
  if (buffer.uri && buffer.uri.match(/^data:/)) {
    const uri = buffer.uri;
    buffer.uri = `buffer${bufferIndex}.bin`;
    buffer._buffer = new Buffer(uri.split(',')[1], 'base64');
    return;
  }
  throw new Error('Only buffers using Data URIs are currently supported');
});

const meshNames = new Set( program.meshes );
const bufferViewMap = {};

// Group bufferviews by mesh.
json.meshes.forEach((mesh) => {
  if (!meshNames.has(mesh.name)) return;
  mesh.primitives.forEach((prim) => {
    if (prim.indices) markAccessor(json.accessors[prim.indices]);
    Object.keys(prim.attributes).forEach((attrName) => {
      markAccessor(json.accessors[prim.attributes[attrName]]);
    });

    function markAccessor (accessor) {
      const bufferView = json.bufferViews[accessor.bufferView];
      if (bufferViewMap[accessor.bufferView] === undefined) {
        bufferViewMap[accessor.bufferView] = mesh.name;
      } else if (bufferViewMap[accessor.bufferView] !== mesh.name) {
        throw new Error('Not implemented: Two meshes share a bufferview.');
      }
    };
  });
});

// Write data for each mesh to a new buffer.
program.meshes.forEach((meshName) => {
  let buffer = new Buffer([]);

  console.log(`📦  ${meshName}`);

  json.bufferViews.forEach((bufferView, bufferViewIndex) => {
    if (bufferViewMap[bufferViewIndex] !== meshName) return;
    console.log(meshName + ':' + bufferViewIndex, bufferView);

    // Extract data from original buffer.
    console.log(`original before: ${json.buffers[bufferView.buffer]._buffer.byteLength} w/ offset ${bufferView.byteOffset} and length ${bufferView.byteLength}`);
    const spliceOpts = {buffer: json.buffers[bufferView.buffer]._buffer};
    const tmp = splice(spliceOpts, bufferView.byteOffset, bufferView.byteLength);
    console.log(`spliced: ${tmp.byteLength}`);
    json.buffers[bufferView.buffer]._buffer = spliceOpts.buffer;
    console.log(`original after: ${json.buffers[bufferView.buffer]._buffer.byteLength}`);

    // Write data to new buffer.
    const affectedByteOffset = bufferView.byteOffset + bufferView.byteLength;
    const affectedBuffer = bufferView.buffer;
    bufferView.byteOffset = buffer.byteLength;
    bufferView.buffer = json.buffers.length;
    buffer = splice(buffer, null, null, tmp);

    // Update remaining buffers.
    json.bufferViews.forEach((affectedBufferView) => {
      if (affectedBufferView.buffer === affectedBuffer
          && affectedBufferView.byteOffset >= affectedByteOffset) {
        affectedBufferView.byteOffset -= bufferView.byteLength;
      }
    });
    // TODO: Update embedded images, or throw an error.
  });  

  json.buffers.push({uri: `${meshName}.bin`, _buffer: buffer});
});

// Filter out empty buffers.
json.buffers = json.buffers.filter((buffer, bufferIndex) => {
  buffer.byteLength = buffer._buffer.byteLength;
  if (buffer.byteLength > 0) return true;
  json.bufferViews.forEach((bufferView) => {
    if (bufferView.buffer >= bufferIndex) bufferView.buffer--;
  });
  return false;
});

// Write output.
console.log('---');
console.log(json.buffers.map((b, i) => `${b.uri}: ${b._buffer.byteLength} bytes`));

json.buffers.forEach((buffer, index) => {
  const _buffer = buffer._buffer;
  delete buffer._buffer;
  fs.writeFileSync(path.join(outputDirectory, buffer.uri), _buffer);
});
fs.writeFileSync(program.output, JSON.stringify(json, null, program.prettyprint ? 2 : 0));
