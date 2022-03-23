#!/usr/bin/env esmo

import path from 'node:path'
import { Record as ImRecord } from 'immutable'
import type { PartialDeep } from 'type-fest'
import consola from 'consola'
import { isDef, p } from '@antfu/utils'
import fse from 'fs-extra'
import { execa } from 'execa'
import boxen from 'boxen'
import minimist from 'minimist'
import chalk from 'chalk'
import fglob from 'fast-glob'
import {
  DIR_ROOT,
  downloadGitDir,
  getTempDir,
  prettyDiff,
  writeTargetJSON
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - not in root dir (its not transpiled, so ignore).
} from '../../scripts/utils'

interface GitConfig {
  gitHost: string
  gitUserId: string
  gitRepoId: string
}

interface GeneratorProps {
  useRxJS6?: boolean | string
  usePromise?: boolean | string
  supportsES6: boolean | string
  withInterfaces: boolean | string

  [key: string]: string | boolean | undefined
}

interface GeneratorConfig extends GitConfig {
  additionalProperties: GeneratorProps
  generatorName: string
  templateDir: string
  output: string
}

interface OASConfig {
  $schema: string
  spaces: number
  'generator-cli': {
    version: string
    generators: Record<
      string,
      GeneratorConfig & Record<string, string | boolean>
    >
  }
}

interface TemplatesConfig {
  extends: string
}

const OAS_GENERATOR_VERSION = '5.3.1'

const GeneratorRecord = ImRecord<GeneratorConfig>({
  gitRepoId: 'openapi-generator-clients',
  gitUserId: 'BradenM',
  gitHost: 'github.com',
  generatorName: '',
  templateDir: '',
  output: '',
  additionalProperties: {
    supportsES6: true,
    usePromise: true,
    useRxJS6: true,
    withInterfaces: true
  }
})

const OASRecord = ImRecord<PartialDeep<OASConfig>>({
  $schema:
    'node_modules/@openapitools/openapi-generator-cli/config.schema.json',
  spaces: 2,
  'generator-cli': { version: OAS_GENERATOR_VERSION }
})

const readConfig = async (): Promise<PartialDeep<OASConfig>> => {
  return (await import(
    './openapitools.json'
  )) as unknown as PartialDeep<OASConfig>
}

const getGeneratorConfig = async (
  genPath: string
): Promise<TemplatesConfig | undefined> => {
  const cfgPath = path.join(genPath, 'config.json')
  if (await fse.pathExists(cfgPath)) {
    consola.info(`Loading generator config: ${cfgPath}`)
    return await fse.readJSON(cfgPath)
  }
  return undefined
}

const buildGenerator = async (gen: GeneratorConfig) => {
  const rec = GeneratorRecord(gen)
  if (rec.has('templateDir')) {
    const genConfig = await getGeneratorConfig(rec.templateDir)
    if (!genConfig) return rec
    if (!genConfig.extends) return rec
    const basePath = path.resolve(rec.templateDir, genConfig.extends)
    const tempsDir = getTempDir()
    // copy base
    await fse.copy(basePath, tempsDir, { overwrite: true, recursive: true })
    // copy overrides
    await fse.copy(rec.templateDir, tempsDir, {
      overwrite: true,
      recursive: true
    })
    const newRec = rec.set('templateDir', tempsDir)
    consola.log(
      boxen(prettyDiff(rec.toJSON(), newRec.toJSON()), {
        titleAlignment: 'left',
        margin: 1
      })
    )
    return newRec
  }
  return rec
}

const buildConfig = async () => {
  const cfg = await readConfig()
  const origCfg = OASRecord(cfg)

  const generators = await p(
    Object.entries(cfg['generator-cli']?.generators || [])
  )
    .filter(([, gen]) => isDef(gen))
    .map(async ([name, gen]) => [
      name,
      await buildGenerator(gen as GeneratorConfig)
    ])
  const newConfig = origCfg.mergeDeepIn(
    ['generator-cli', 'generators'],
    Object.fromEntries(generators)
  )
  consola.log(newConfig)
  return [origCfg, newConfig]
}

const updateConfig = async (cfg: ImRecord<PartialDeep<OASConfig>>) => {
  consola.log('Writing config:', cfg.toJSON())
  await writeTargetJSON('./openapitools.json', cfg.toJSON())
}

const postProcessLint = async (clientPath: string) => {
  consola.info(chalk.bold.blackBright('Linting with eslint...'))
  const targets = await fglob(`packages/clients/${clientPath}/**/*.ts`, {
    cwd: DIR_ROOT,
    onlyFiles: true,
    ignore: ['**/node_modules/**']
  })
  const cfg = path.resolve(DIR_ROOT, '.eslintrc')
  let proc
  try {
    proc = execa(
      'eslint',
      [
        `--config=${cfg}`,
        `--resolve-plugins-relative-to=${DIR_ROOT}`,
        '--fix',
        ...targets
      ],
      {
        stdio: 'inherit',
        preferLocal: true,
        localDir: DIR_ROOT,
        windowsHide: false,
        cwd: DIR_ROOT
      }
    )
    await proc
  } catch (e) {
    consola.log(e)
    consola.error(e)
    throw e
  }
}

const postProcessFormat = async (clientPath: string) => {
  consola.info(chalk.bold.blackBright('Formatting with prettier...'))
  try {
    await execa(
      'prettier',
      ['--write', `packages/clients/${clientPath}/**/*.ts`],
      {
        stdio: 'inherit',
        windowsHide: false,
        preferLocal: true,
        localDir: DIR_ROOT,
        cwd: DIR_ROOT
      }
    )
  } catch (e) {
    consola.error(e)
    throw e
  }
}

const runGenerate = async (clientName: string) => {
  const [origCfg, newCfg] = await buildConfig()
  await updateConfig(newCfg)
  try {
    await execa(
      'openapi-generator-cli',
      ['generate', `--generator-key=${clientName}`],
      {
        stdio: 'inherit',
        preferLocal: true,
        windowsHide: false
      }
    )
    const clientNs = clientName.split('-', 2)[0]
    await postProcessLint(clientNs)
    await postProcessFormat(clientNs)
    const files = await fse.readdir(
      newCfg['generator-cli'].generators[clientName].templateDir
    )
    const report = files
      .map(
        (f) =>
          `${chalk.whiteBright('Used override:')} ${chalk.bold.cyanBright(f)}`
      )
      .join('\n')
    consola.log(
      boxen(report, {
        title: chalk.bold.whiteBright(`Generated: ${clientName}`),
        titleAlignment: 'left',
        margin: 1,
        padding: 1
      })
    )
  } finally {
    await updateConfig(origCfg)
  }
}

const retrieveTemplates = async (targetPath: string) => {
  await downloadGitDir(
    'OpenAPITools',
    'openapi-generator',
    'modules/openapi-generator/src/main/resources/typescript',
    '28cc28626531158ce0517dcaabb160208d62aba3',
    targetPath
  )
}

export default (async function () {
  const argv = minimist(process.argv.slice(2), { string: ['pull'] })
  if (argv.pull) return await retrieveTemplates(argv.pull)

  const generatorTargets = ['clever-v1', 'domain-v1']

  let targets = argv._ ?? generatorTargets
  targets = targets.map((t) => generatorTargets.find((gt) => gt.match(t)))
  consola.log('Generator Targets:', targets)
  await p(targets, { concurrency: 1 }).map(runGenerate)
})()
