# Roundtrip tests

Integration tests, completing a read/write roundtrip on the glTF-Sample-Models repository. Test constants assume that the glTF-Transform and glTF-Sample-Models repositories have been cloned into the same project folder. After generating roundtrip models, serve this folder locally and confirm that the before/after examples match.

```
# Setup/clean.
node test/clean.js

# Run.
node test/roundtrip.js

# Verify.
serve test
```

For unit tests on individual packages, see `packages/*/test`.
