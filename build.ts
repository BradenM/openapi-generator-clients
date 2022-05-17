import { builder } from '../../scripts/compile/build-config'
import type { BuildOptions } from '../../scripts/compile/build-config'

const CLIENTS = {
  SERVER: 'server',
  DOMAIN: 'domain',
  CLEVER: 'clever'
} as const

type Client = typeof CLIENTS[keyof typeof CLIENTS]

const CLIENT_VERSIONS = {
  [CLIENTS.SERVER]: ['v1'],
  [CLIENTS.DOMAIN]: ['v1'],
  [CLIENTS.CLEVER]: ['v1']
}

const buildClientEntry = (name: Client): BuildOptions => {
  const versions = CLIENT_VERSIONS[name]
  return {
    builder: 'esbuild',
    bundle: true,
    name,
    tsconfig: `./${name}/tsconfig.build.json`,
    entryPoints: [
      `./${name}/index.ts`,
      ...versions.map((v) => `./${name}/${v}/index.ts`)
    ],
    outdir: `dist/${name}`
  }
}

builder([
  {
    builder: 'esbuild',
    bundle: true,
    tsconfig: './tsconfig.build.json',
    entryPoints: ['./src/index.ts'],
    outdir: './dist'
  },
  {
    bundle: true,
    tsconfig: './tsconfig.build.json',
    entryPoints: { browser: './src/index.ts' },
    platform: 'browser',
    skipNodeModulesBundle: false,
    minify: true,
    onSuccess: undefined,
    ignoreWatch: Object.values(CLIENTS)
  },
  {
    ...buildClientEntry(CLIENTS.SERVER),
    builder: 'esbuild',
    platform: 'browser',
    minify: true
  },
  buildClientEntry(CLIENTS.DOMAIN),
  buildClientEntry(CLIENTS.CLEVER)
])
