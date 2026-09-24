# Vendored pdf-lib runtime

`pdf-lib-1.17.1.min.cjs` is the unmodified UMD distribution of
[`pdf-lib` 1.17.1](https://www.npmjs.com/package/pdf-lib/v/1.17.1), used by the
shared watermark service.

- Source: `https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js`
- SHA-256: `0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f`
- License: MIT (`pdf-lib-LICENSE.md`)

The runtime is pinned in-repository because the restricted CI npm proxy cannot
retrieve the package tarball. Update the version, bundle, license, checksum, and
watermark tests together.
