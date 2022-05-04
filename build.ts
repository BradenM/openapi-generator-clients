import type tsup from 'tsup'
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
    bundle: true,
    tsconfig: `./${name}/tsconfig.build.json`,
    entryPoints: [
      `./${name}/index.ts`,
      ...versions.map((v) => `./${name}/${v}/index.ts`)
    ],
    outDir: `dist/${name}`
  }
}

builder([
  {
    bundle: true,
    tsconfig: './tsconfig.build.json',
    entryPoints: ['./src/index.ts'],
    outDir: 'dist'
  },
  {
    bundle: true,
    tsconfig: './tsconfig.build.json',
    entryPoints: { browser: './src/index.ts' },
    platform: 'browser',
    skipNodeModulesBundle: false
  } as tsup.Options,
  {
    ...buildClientEntry(CLIENTS.SERVER),
    platform: 'browser',
    skipNodeModulesBundle: false
  } as tsup.Options,
  buildClientEntry(CLIENTS.DOMAIN),
  buildClientEntry(CLIENTS.CLEVER)
])
