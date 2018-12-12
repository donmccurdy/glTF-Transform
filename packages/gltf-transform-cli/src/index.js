#!/usr/bin/env node

const fs = require('fs');
const program = require('commander');
const { version } = require('../package.json');
const { GLTFUtil } = require('gltf-transform-util');

const readGLB = (filepath) => {
    const glbBuffer = fs.readFileSync(filepath);
    // Byte offset may be non-zero.
    const {byteOffset, byteLength} = glbBuffer;
    const glb = glbBuffer.buffer.slice(byteOffset, byteOffset + byteLength);
    return GLTFUtil.wrapGLB(glb);
};

program
    .version(version)
    .usage('gltf-transform <command> <file> [...options]');

program
    .command('analyze [model]')
    .action((file) => {
        const container = readGLB(file);
        const analysis = GLTFUtil.analyze(container);
        console.log(JSON.stringify(analysis, null, 2));
    });

program.command('format [model]')
    .option('-m, --mode', 'Format ("binary", "separate", or "embedded"). Default is "binary".')
    .action((file) => {
        console.error('[format] Not implemented.');
    });

program.command('pack [model]')
    .option('-s, --max-size', 'Maximum texture size. Default is 2048.')
    .action((file) => {
        console.error('[pack] Not implemented.');
    });

program.command('ao [model]')
    .option('-r, --resolution', 'AO resolution.')
    .option('-s, --samples', 'Number of samples.')
    .action((file) => {
        console.error('[ao] Not implemented.');
    });

program.on('command:*', function () {
    program.outputHelp();
    console.log('\n');
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});

program.parse(process.argv);