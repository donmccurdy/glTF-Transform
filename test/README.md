# Roundtrip tests

Integration tests, completing a read/write roundtrip on the [KhronosGroup/glTF-Sample-Models](https://github.com/KhronosGroup/glTF-Sample-Models) repository. Test constants assume that the glTF-Transform and glTF-Sample-Models repositories are siblings under a common parent folder. After generating roundtrip models, serve the `test/` folder locally and confirm that the before/after examples match.

```
# Setup/clean.
node test/clean.js

# Run.
node test/roundtrip.js

# Verify.
serve test
```

For unit tests on individual packages, see `packages/*/test`.
