#!/usr/bin/env esmo

import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDef, p } from '@antfu/utils'
import boxen from 'boxen'
import chalk from 'chalk'
import chokidar from 'chokidar'
import consola from 'consola'
import { execa } from 'execa'
import fglob from 'fast-glob'
import fse from 'fs-extra'
import type { RecordOf } from 'immutable'
import { Record as ImRecord } from 'immutable'
import { debounce } from 'lodash-es'
import minimist from 'minimist'
import * as R from 'rambdax'
import type { PartialDeep } from 'type-fest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - not in root dir (its not transpiled, so ignore).
import { doLintAndFormat } from '../../scripts/format'
import {
  createFileChecksum,
  downloadGitDir,
  getTempDir,
  prettyDiff,
  writeTargetJSON
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

  useInversify?: boolean
  useObjectParameters?: boolean
  legacyDiscriminatorBehavior?: boolean
  platform?: 'node' | 'deno' | 'browser'
  disallowAdditionalPropertiesIfNotPresent?: boolean
  npmName?: string

  [key: string]: string | boolean | undefined
}

interface GeneratorConfig extends GitConfig {
  additionalProperties: GeneratorProps
  generatorName: string
  templateDir: string
  output: string
  glob?: string
  inputSpec?: string
  removeOperationIdPrefix: boolean
  legacyDiscriminatorBehavior: boolean
}

interface ExtendedGeneratorConfig extends GeneratorConfig {
  additionalArgs: string[]
  drop: string[]
  workspace?: string
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
  drop?: string[]
}

interface GenerateOptions {
  clients: string[]
  overwrite?: boolean
  additionalArgs?: string[]
}

const OAS_GENERATOR_VERSION = '6.0.0-beta'

const GeneratorRecord = ImRecord<ExtendedGeneratorConfig>({
  gitRepoId: 'openapi-generator-clients',
  gitUserId: 'BradenM',
  gitHost: 'github.com',
  generatorName: '',
  templateDir: '',
  output: '',
  inputSpec: undefined,
  glob: undefined,
  workspace: undefined,
  drop: [],
  additionalArgs: [],
  removeOperationIdPrefix: true,
  legacyDiscriminatorBehavior: false,
  additionalProperties: {
    supportsES6: true,
    usePromise: true,
    useRxJS6: true,
    withInterfaces: true,
    useInversify: undefined,
    useObjectParameters: undefined,
    legacyDiscriminatorBehavior: false,
    platform: undefined,
    disallowAdditionalPropertiesIfNotPresent: undefined,
    npmName: undefined
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

const buildGenerator = async (
  gen: GeneratorConfig,
  options?: Pick<GenerateOptions, 'overwrite' | 'additionalArgs'>
) => {
  const rec = GeneratorRecord(gen).set(
    'additionalArgs',
    options?.additionalArgs ?? []
  )
  let finalRec = rec
  const workspace = getTempDir()
  const tempsDir = path.resolve(workspace, 'templates')
  const cfgPath = path.resolve(workspace, 'config.json')
  const outputPath = options?.overwrite
    ? path.resolve(rec.get('output'))
    : path.join(workspace, rec.get('output'))
  if (rec.has('templateDir')) {
    const genConfig = await getGeneratorConfig(rec.templateDir)
    if (genConfig && genConfig.extends) {
      const basePath = path.resolve(rec.templateDir, genConfig.extends)
      // copy base
      await fse.copy(basePath, tempsDir, { overwrite: true, recursive: true })
      // copy overrides
      await fse.copy(rec.templateDir, tempsDir, {
        overwrite: true,
        recursive: true
      })
      const newRec = rec.set('templateDir', tempsDir)
      finalRec = newRec
      if (genConfig.drop) finalRec = newRec.set('drop', genConfig.drop)
      consola.log(
        boxen(prettyDiff(rec.toJSON(), newRec.toJSON()), {
          titleAlignment: 'left',
          margin: 1
        })
      )
    }
  }
  const glob = finalRec.get('glob')
  let inputSpec = finalRec.get('inputSpec')
  if (glob && !inputSpec) {
    inputSpec = path.resolve(glob)
  }
  finalRec = finalRec
    .set('output', outputPath)
    .set('inputSpec', inputSpec)
    .set('workspace', workspace)

  await fse.writeJSON(cfgPath, finalRec.toJSON())
  consola.success(`wrote generator config @ ${cfgPath}`)

  return finalRec
}

const buildConfig = async ({
  clients,
  overwrite = false,
  additionalArgs = []
}: GenerateOptions) => {
  const cfg = await readConfig()
  const origCfg = OASRecord(cfg)

  const generators = await p(
    Object.entries(cfg['generator-cli']?.generators || [])
  )
    .filter(
      ([genName, gen]) =>
        isDef(gen) && (clients ? clients.includes(genName) : true)
    )
    .map(async ([name, gen]) => [
      name,
      await buildGenerator(gen as GeneratorConfig, {
        overwrite,
        additionalArgs
      })
    ])
  const newGenerators = Object.fromEntries(generators)
  const newConfig = origCfg.mergeDeepIn(
    ['generator-cli', 'generators'],
    newGenerators
  )
  consola.log(newConfig)
  return [origCfg, newConfig, newGenerators]
}

const updateConfig = async (cfg: ImRecord<PartialDeep<OASConfig>>) => {
  consola.log('Writing config:', cfg.toJSON())
  await writeTargetJSON('./openapitools.json', cfg.toJSON())
}

const runBatchGenerate = async (
  clientName: string,
  options?: Pick<GenerateOptions, 'additionalArgs' | 'overwrite'>
): Promise<[RecordOf<ExtendedGeneratorConfig>, Map<string, string>]> => {
  const [origCfg, _, newGenerators] = await buildConfig({
    clients: [clientName],
    ...(options ?? {})
  })
  const genTarget = newGenerators[
    clientName
  ] as RecordOf<ExtendedGeneratorConfig>
  const genTempsDir = genTarget.get('templateDir') as string
  const genConfig = path.resolve(
    genTarget.get('workspace') as string,
    'config.json'
  )
  const genRoot = genTarget.get('output') as string
  const genDrops = genTarget.get('drop')
  const addArgs = genTarget.get('additionalArgs')

  const proc = execa(
    'openapi-generator-cli',
    [
      'batch',
      `--root-dir=${genRoot}`,
      `--includes-base-dir=${genTempsDir}`,
      ...addArgs,
      '--',
      genConfig
    ],
    {
      stdio: 'inherit',
      preferLocal: true,
      windowsHide: false
    }
  )
  try {
    await proc
    await R.mapFastAsync<string, void>(async (fileDrop) => {
      consola.info(`dropping file: ${fileDrop}`)
      const fullPath = path.resolve(genRoot, fileDrop)
      try {
        await fse.rm(fullPath)
      } catch (e) {
        consola.error(e)
      }
    })(genDrops)
  } catch (e) {
    consola.error(e)
  } finally {
    await updateConfig(origCfg)
  }
  const ignorePath = path.resolve(genRoot, '.openapi-generator-ignore')
  const ignoreContents = await fse.readFile(ignorePath)
  await fse.writeFile(ignorePath, [ignoreContents, ...genDrops].join('\n'))
  const files = await fglob(path.join(genRoot, '{*,**/*}'), {
    onlyFiles: true,
    unique: true
  })
  const hashesMap = new Map()
  await R.mapFastAsync<string, void>(async (fpath) => {
    const relPath = path.relative(genRoot, fpath)
    const xsum = await createFileChecksum(fpath)
    hashesMap.set(relPath, xsum)
  })(files)
  return [genTarget, hashesMap]
}

const watchGenerate = async (clientName: string) => {
  const cfg = await readConfig()
  const oasCfg = OASRecord(cfg)

  const origGens = oasCfg.getIn(['generator-cli', 'generators']) as Record<
    string,
    GeneratorConfig
  >

  let [baseTarget, baseHashes] = await runBatchGenerate(clientName, {
    // run full generate first time only.
    overwrite: true,
    additionalArgs: ['--clean']
  })
  const clientNs = clientName.split('-', 2)[0]
  await doLintAndFormat(`packages/clients/${clientNs}/{*,**/*}.ts`)

  const inputSpec = baseTarget.get('inputSpec') as string

  let specHash = await createFileChecksum(inputSpec)

  const watcher = chokidar.watch(inputSpec, {
    awaitWriteFinish: true,
    atomic: true,
    useFsEvents: true
  })

  const handleChange = async () => {
    const newSpecHash = await createFileChecksum(inputSpec)
    if (newSpecHash === specHash) {
      consola.info('input spec has not changed...')
      return
    }
    specHash = newSpecHash
    const [newTarget, newHashes] = await runBatchGenerate(clientName, {
      overwrite: false
    })

    const changedHashes = Array.from(newHashes.entries()).filter(
      ([filePath, newHash]) => {
        if (!baseHashes.has(filePath)) return true
        return baseHashes.get(filePath) !== newHash
      }
    )
    consola.log('changed hashes:', changedHashes)

    const newFilePaths = await R.mapFastAsync<[string, string], string>(
      async ([relFilePath, newHash]) => {
        const newRoot = newTarget.get('output')
        const newFilePath = path.resolve(newRoot, relFilePath)
        const destFilePath = path.resolve(
          fileURLToPath(new URL(origGens[clientName].output, import.meta.url)),
          relFilePath
        )
        consola.info(`Updating: ${newFilePath} -> ${destFilePath}`)
        await fse.copyFile(newFilePath, destFilePath)
        return destFilePath
      }
    )(changedHashes)

    await doLintAndFormat(
      ...newFilePaths.filter(
        (fp) => !path.basename(fp).match(/(\.openapi-generator-ignore|FILES)/)
      )
    )

    const sysTemp = os.tmpdir()
    const workspace = baseTarget.get('workspace') as string
    if (workspace.startsWith(sysTemp)) {
      try {
        await fse.remove(workspace)
      } catch (e) {
        consola.warn('failed to cleanup temp dir:', e)
      }
    }

    baseTarget = newTarget
    baseHashes = newHashes
  }

  watcher.on('change', debounce(handleChange, 10))
}

const runGenerate = async (clientName: string) => {
  const [origCfg, newCfg, newGenerators] = await buildConfig()
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
    await doLintAndFormat(`packages/clients/${clientNs}/{*,**/*}.ts`)
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
  // See:
  // https://github.com/OpenAPITools/openapi-generator/tree/master/modules/openapi-generator/src/main/resources/typescript
  await downloadGitDir(
    'OpenAPITools',
    'openapi-generator',
    'modules/openapi-generator/src/main/resources/typescript',
    '8c57b66da90bdf1d5a9a7d3588458731f0dec078',
    targetPath
  )
}

export default (async function () {
  const argv = minimist(process.argv.slice(2), {
    string: ['pull'],
    boolean: ['watch'],
    default: { watch: false }
  })
  if (argv.pull) return await retrieveTemplates(argv.pull)

  const generatorTargets = ['clever-v1', 'domain-v1', 'server-v1']

  let targets = argv._ ?? generatorTargets
  targets = targets.map((t) => generatorTargets.find((gt) => gt.match(t)))
  consola.log('Generator Targets:', targets)
  if (argv.watch) {
    await p(targets).map(watchGenerate)
  } else {
    await p(targets, { concurrency: 1 }).map((t) =>
      runBatchGenerate(t, { overwrite: true, additionalArgs: ['--clean'] })
    )
    await doLintAndFormat(
      ...targets.map(
        (t) => `packages/clients/${t.split('-', 2)[0]}/{*,**/*}.ts`
      )
    )
  }
})()
