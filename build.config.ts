import { BuildEntry, defineBuildConfig } from 'unbuild'
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

const CLIENTS = {
  server: ['v1'],
  domain: ['v1'],
  clever: ['v1']
}

export default defineBuildConfig({
  entries: Object.entries(CLIENTS)
    .map(([name, versions]) => generatorEntry(name, ...versions))
    .flat(),
  declaration: true,
  externals: [...Object.keys(pkg.dependencies)]
})
