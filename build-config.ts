#!/usr/bin/env esmo

import { Record as ImRecord } from 'immutable'
import { PartialDeep } from 'type-fest'
import consola from 'consola'
import P from '@antfu/p'
import { isDef } from '@antfu/utils'
import { writeTargetJSON } from '../../scripts/utils'

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

const buildGenerator = async (gen: GeneratorConfig) => {
  return GeneratorRecord(gen)
}

const buildConfig = async () => {
  const cfg = await readConfig()
  const generators = await P(
    Object.entries(cfg['generator-cli']?.generators || [])
  )
    .filter(([, gen]) => isDef(gen))
    .map(async ([name, gen]) => [
      name,
      await buildGenerator(gen as GeneratorConfig)
    ])
  const newConfig = OASRecord(cfg).mergeDeepIn(
    ['generator-cli', 'generators'],
    Object.fromEntries(generators)
  )
  consola.log(newConfig)
  return newConfig
}

const updateConfig = async () => {
  const cfg = (await buildConfig()).toJSON()
  await writeTargetJSON('./openapitools.json', cfg)
}

export default (async function () {
  await updateConfig()
})()
