import { defineBuildConfig } from 'unbuild'
import pkg from './package.json'

export default defineBuildConfig({
  entries: [
    {
      name: 'server/v1/index',
      outDir: './dist/server/v1',
      format: 'esm',
      input: './server/v1/index',
      declaration: true
    },
    {
      name: 'server/index',
      outDir: './dist/server',
      format: 'esm',
      input: './server/v1/index',
      declaration: true
    },
    {
      name: 'clever/v1/index',
      outDir: './dist/clever/v1',
      format: 'esm',
      input: './clever/v1/index',
      declaration: true
    },
    {
      name: 'clever/index',
      outDir: './dist/clever',
      format: 'esm',
      input: './clever/v1/index',
      declaration: true
    }
  ],
  declaration: true,
  externals: [...Object.keys(pkg.dependencies)]
})
