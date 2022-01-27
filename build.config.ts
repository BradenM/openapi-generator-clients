import { defineBuildConfig } from 'unbuild'
import pkg from './package.json'

export default defineBuildConfig({
  entries: [
    {
      name: 'server/v1',
      outDir: './dist/server/v1',
      format: 'esm',
      input: './server/v1/index',
      declaration: true
    }
  ],
  declaration: true,
  externals: [...Object.keys(pkg.dependencies)]
})
