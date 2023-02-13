import type {
	ExtendedGeneratorConfig,
	GeneratorConfig,
	GeneratorProps,
	OASConfig,
	TemplateConfig,
} from '@openapi-generator-clients/types'
import {Record as ImRecord, type RecordOf} from 'immutable'
import type {PartialDeep} from 'type-fest'

const OAS_GENERATOR_VERSION = '6.0.0-beta'

export const defaultProperties: GeneratorProps = {
	supportsES6: true,
	usePromise: true,
	useRxJS6: true,
	withInterfaces: true,
	useInversify: undefined,
	useObjectParameters: undefined,
	legacyDiscriminatorBehavior: false,
	platform: undefined,
	disallowAdditionalPropertiesIfNotPresent: undefined,
	npmName: undefined,
}

export const templateConfigDefaults: TemplateConfig = {
	generatorVersion: '',
	additionalProperties: defaultProperties,
	drop: [],
	additionalArgs: [],
	files: {},
}

export const generatorRecordDefaults: GeneratorConfig = {
	gitRepoId: '',
	gitUserId: '',
	gitHost: 'github.com',
	generatorName: '',
	templateDir: '',
	output: '',
	inputSpec: undefined,
	glob: undefined,
	removeOperationIdPrefix: true,
	legacyDiscriminatorBehavior: false,
	files: {},
	additionalProperties: defaultProperties,
}

export const GeneratorRecord = ImRecord<ExtendedGeneratorConfig>(
	{
		...templateConfigDefaults,
		...generatorRecordDefaults,
	},
	'GeneratorRecord',
)

export const TemplateConfigRecord = ImRecord<TemplateConfig>(
	templateConfigDefaults,
	'TemplateConfigRecord',
)

export const OASGeneratorRecord = ImRecord<GeneratorConfig>(
	generatorRecordDefaults,
	'OASGeneratorRecord',
)
export interface OASGeneratorRecord extends RecordOf<GeneratorConfig> {}

export const OASRecord: ImRecord.Factory<PartialDeep<OASConfig>> = ImRecord<
	PartialDeep<OASConfig>
>(
	{
		$schema:
			'node_modules/@openapitools/openapi-generator-cli/config.schema.json',
		spaces: 2,
		'generator-cli': {version: OAS_GENERATOR_VERSION, generators: {}},
	},
	'OASRecord',
)
export interface OASRecord extends RecordOf<OASConfig> {}
