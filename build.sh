#!/usr/bin/bash

npm link
cd packages

for dir in ./
do
  cd packages/dir
  npm install
  npm link
  npm link gltf-transform
  cd ../../
  npm link "gltf-${dir}"
  cd packages/
done
