# Scripts

## Roundtrip tests

Integration tests, completing a read/write roundtrip on the [KhronosGroup/glTF-Sample-Models](https://github.com/KhronosGroup/glTF-Sample-Models) repository. Test constants assume that the glTF-Transform and glTF-Sample-Models repositories are siblings under a common parent folder. After generating roundtrip models, serve the `test/` folder locally and confirm that the before/after examples match.

```
# Run.
node scripts/roundtrip.cjs

# Verify.
npx serve scripts
```

For unit tests on individual packages, see `packages/*/test`.
