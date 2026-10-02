# Vendored LinkMask package

`scttlnd-linkmask-1.0.1.tgz` is an unmodified `npm pack` archive of
`@scttlnd/linkmask` version **1.0.1**, from
[scottlinddk/LinkMask commit a54dd5b830efda97a28facee275f14a11cb56d98](https://github.com/scottlinddk/LinkMask/commit/a54dd5b830efda97a28facee275f14a11cb56d98).

The npm registry returned 404 for `@scttlnd/linkmask` on 2 October 2026. Keeping
the archive in this repository allows `npm ci` to install the locked dependency
without access to the upstream GitHub repository. The package declares its
license as `UNLICENSED`; vendoring does not change its licensing.

Once this version is published to npm, replace the local archive dependency:

```sh
npm install @scttlnd/linkmask@1.0.1
npm run check
npm run build
```

Commit the updated `package.json` and `package-lock.json`, then remove the unused
archive and this provenance note. Use a reviewed newer version if 1.0.1 is not the
published release.
