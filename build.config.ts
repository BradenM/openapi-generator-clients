import { defineBuildConfig } from 'unbuild'
import pkg from './package.json'
export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  externals: [...Object.keys(pkg.dependencies)]
})
