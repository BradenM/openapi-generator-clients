import { URL, fileURLToPath } from 'node:url'
import { mergeAll } from 'rambdax'
import type { BuildEntry } from 'unbuild'
import { defineBuildConfig } from 'unbuild'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - not in root dir (its not transpiled, so ignore).
import { writeTargetJSON } from '../../scripts/utils'
import pkg from './package.json'

const generatorEntry = (
  name: string,
  defaultVersion = 'v1',
  ...versions: string[]
): BuildEntry[] => [
  ...[defaultVersion, ...versions].map((v) => ({
    name: `${name}/${v}/index`,
    outDir: `./dist/${name}/${v}`,
    format: 'esm',
    input: `./${name}/${v}/index`,
    declaration: true
  })),
  {
    name: `${name}/index`,
    outDir: `./dist/${name}`,
    format: 'esm',
    input: `./${name}/${defaultVersion}/index`,
    declaration: true
  }
]

const manifestExport = (
  name: string,
  defaultVersion = 'v1',
  ...versions: string[]
) => ({
  dev: {
    [`./${name}`]: {
      import: `./${name}/${defaultVersion}/index.ts`,
      types: `./${name}/${defaultVersion}/index.ts`
    },
    ...Object.fromEntries(
      [defaultVersion, ...versions].map((v) => [
        `./${name}/${v}`,
        {
          import: `./${name}/${v}/index.ts`,
          types: `./${name}/${v}/index.ts`
        }
      ])
    )
  },
  publish: {
    [`./${name}`]: {
      import: `./dist/${name}/${defaultVersion}/index.mjs`,
      types: `./dist/${name}/${defaultVersion}/index.d.ts`
    },
    ...Object.fromEntries(
      [defaultVersion, ...versions].map((v) => [
        `./${name}/${v}`,
        {
          import: `./dist/${name}/${v}/index.mjs`,
          types: `./dist/${name}/${v}/index.d.ts`
        }
      ])
    )
  }
})

const CLIENTS = {
  server: ['v1'],
  domain: ['v1'],
  clever: ['v1']
}

const clientEntries = Object.entries(CLIENTS)
  .map(([name, versions]) => generatorEntry(name, ...versions))
  .flat()

const clientExports = Object.entries(CLIENTS).map(([name, versions]) =>
  manifestExport(name, ...versions)
)

const devExports = mergeAll(clientExports.map(({ dev }) => dev)) as object
const publishExports = mergeAll(
  clientExports.map(({ publish }) => publish)
) as object

const newManifest = {
  ...pkg,
  exports: {
    ...pkg.exports,
    ...publishExports
    // ...devExports
  },
  publishConfig: {
    ...pkg.publishConfig,
    exports: {
      ...(pkg.publishConfig?.exports ?? {}),
      ...publishExports
    }
  }
}

;(async function () {
  await writeTargetJSON(
    fileURLToPath(new URL('./package.json', import.meta.url)),
    newManifest
  )
})()

export default defineBuildConfig({
  entries: ['src/index', ...clientEntries],
  declaration: true,
  rollup: {
    esbuild: {
      tsconfig: fileURLToPath(new URL('./tsconfig.build.json', import.meta.url))
    }
  },
  externals: [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.peerDependencies)
  ]
})
