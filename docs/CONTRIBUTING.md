# Contributing

This project consists of multiple NPM packages, managed in one repository with
https://lerna.js.org/. All code, excluding Node.js-based tests, is written in TypeScript.
I recommend using VSCode for linting and type information, which becomes especially helpful
when dealing with glTF schema objects.

After cloning the repository, run:

```
yarn install
```

The project relies on yarn workspaces and will not build with npm. To build and test all code,
run:

```
yarn run dist
yarn test
```

To run an arbitrary command across all packages:

```
lerna exec -- <command>
```

While working, use `yarn run watch` to watch and rebuild code after changes. To use a local
version of the CLI, run `yarn link` within the `packages/cli` directory. Then
`gltf-transform -h` will use local code instead of any global installation.

### Pull requests

Before adding new features or packages to the repository, please open an issue on GitHub to discuss
your proposal. Some features may not fit the current scope of the project, or may be more than I am
able to maintain long-term. Even if a feature does not end up in this repository, custom
transform functions can be defined and used externally.

New features should be compatible with both Node.js and Web, though exceptions may be possible in
certain situations. To accomplish that, instances of [HTMLCanvasElement](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
or [headless-gl](https://github.com/stackgl/headless-gl) are passed into API functions by the user,
rather than being created by the API directly.

### Dependencies

I recommend compiling with Node.js v12.x, which is the latest version with a prebuilt binary for
`gl` as of April 2020.

Runtime `dependencies` should be installed only to the sub-package in which they are needed. Any
`devDependencies` are shared across all packages, and should be installed in the project root. Pull
requests should omit any changes to `dist/*` artifacts. Changes including test coverage are
strongly preferred.

### Releasing

> NOTE: Only the maintainer can create new releases.

Currently Lerna [has trouble with 2FA OTPs](https://github.com/lerna/lerna/issues/1091). As a result,
new packages need to be published manually before they can be included in a repo-wide release. Once
that is done, normal releases should use:

```shell
NPM_CONFIG_OTP=123456 lerna publish <version> --force-publish=*
```
