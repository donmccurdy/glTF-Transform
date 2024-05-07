---
title: Contributing | glTF Transform
snippet: This project consists of multiple NPM packages, managed in one repository with Lerna. All code, excluding Node.js-based tests, is written in TypeScript…
---

# Contributing

This project consists of multiple NPM packages, managed in one repository with
[Lerna](https://lerna.js.org/). All code, excluding Node.js-based tests, is written in TypeScript.
I recommend using VSCode for linting and type information, which becomes especially helpful
when dealing with glTF schema objects.

After cloning the repository, install project dependencies. If you haven't worked with Yarn v2+ before, you will need to enable [Corepack](https://yarnpkg.com/corepack) first.

```bash
# First-time Yarn v2+ setup.
corepack enable

# Install dependencies.
yarn install
```

The project relies on [Yarn workspaces](https://classic.yarnpkg.com/docs/workspaces/) and will not build with npm. To build and test all code,
run:

```bash
# Build
yarn run dist

# Test
yarn test
```

To run these or other commands on a subset of packages, use the `--ignore` flag.

```bash
yarn run dist --ignore "@gltf-transform/view"
```

To run an arbitrary command across all packages:

```bash
yarn lerna exec -- <command>
```

While working, use `yarn run watch` to watch and rebuild code after changes. To use a local
version of the CLI, run `yarn link` within the `packages/cli` directory. Then
`gltf-transform -h` will use local code instead of any global installation.

### Pull requests

Before adding new features or packages to the repository, please open an issue on GitHub to discuss
your proposal. Some features may not fit the current scope of the project, or may be more than I am
able to maintain long-term. Even if a feature does not end up in this repository, custom
extensions and functions can be defined and used externally. Changes including test coverage are
strongly preferred.

New features should be compatible with both Node.js and Web, though exceptions may be possible in
certain situations. To accomplish that, some platform-specific resources (like instances of
[HTMLCanvasElement](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)) are passed into
API functions by the user, rather than being created by the API directly.

### Testing

Unit tests use [Ava](https://github.com/avajs/ava).

```bash
# run all tests
yarn test

# run all tests, watching for source file changes to re-run
yarn test --watch

# run one test
yarn test:filter packages/functions/test/palette.test.ts

# run one test, watching for source file changes to re-run
yarn test:filter packages/functions/test/palette.test.ts --watch
```

To use a debugger and step through tests using Chrome Developer Tools, see [_Debugging tests with Chrome DevTools_](https://github.com/avajs/ava/blob/main/docs/recipes/debugging-with-chrome-devtools.md). Add a `debugger;` statement to the body of the test, then run:

```bash
yarn test:debug packages/functions/test/palette.test.ts --break
```

### Dependencies

Runtime dependencies should be installed only to the sub-package in which they are needed. Any
devDependencies are shared across all packages, and should be installed in the project root. Pull
requests should omit any changes to `dist/*` and `yarn.lock` artifacts.

### Documentation

Documentation and examples are written in JSDoc comments on the relevant classes and methods,
processed with [TypeDoc](https://typedoc.org/), and rendered to a custom TypeDoc theme. Additions
and clarification are welcome, and examples may be added inline alongside class documentation.
Certain JSDoc tags have notable meanings within this project:

- `@internal` methods and classes are (1) hidden from documentation, and (2) not included in
  TypeScript definitions for the package. This code is intended only for use within the defining
  package.
- `@hidden` methods and classes are hidden from documentation, but still included in TypeScript
  definitions for the package. This code is not intended for wide use, but may be necessary for
  other packages in the glTF Transform monorepo.
- `@experimental` tags indicate unstable APIs that do not yet follow SemVer conventions.

### Roadmap

glTF Transform supports the complete glTF 2.0 core format, and some extensions. Most official Khronos Group extensions (those prefixed with `KHR_`) will be implemented on a rolling basis — pull requests are very welcome. Multi-vendor extensions (prefixed with `EXT_`) may be included on a case-by-case basis. Single-vendor extensions (any other prefix) are unlikely to be included directly in the project, although glTF Transform does provide APIs to build and maintain implementations for those extensions externally.

Suggestions and PRs for new [Functions](/functions) are also generally welcome.

### Releasing

> NOTE: Only the maintainer can create new releases.

All packages are published together. To create a standard release:

```bash
yarn lerna publish [ patch | minor | major ] --force-publish "*"
```

To create an alpha release:

```bash
yarn lerna publish prerelease --dist-tag next --force-publish "*"
```

If a release contains a new package, `-- --access public` must be appended.
