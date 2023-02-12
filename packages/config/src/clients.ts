import type {
	ExtendedGeneratorConfig,
	Template,
	TemplateConfig,
	Workspace,
} from '@openapi-generator-clients/types'
import {objectMap} from '@antfu/utils'
import {Record as ImRecord, type RecordOf} from 'immutable'
import type {PartialOnUndefinedDeep, SetOptional} from 'type-fest'
import {
	GeneratorRecord,
	OASGeneratorRecord,
	OASRecord,
	TemplateConfigRecord,
} from './generator-record'

export interface BuildOptions {
	templates: Record<string, Template>
	generators: Record<string, PartialOnUndefinedDeep<ExtendedGeneratorConfig>>
}

export interface TemplateVersion {
	path: string
	version: string
	config: TemplateConfig
}

export interface BuildTemplate {
	root: string
	name: string
	versions: TemplateVersion[]
	latest: TemplateVersion
}

export interface BuildClient {
	name: string
	generator: ExtendedGeneratorConfig
	templateVersion: TemplateVersion
	template: Pick<BuildTemplate, 'root' | 'name'>
	templateConfig: TemplateConfig
	workspace?: Workspace | undefined
}

export class ClientRecord extends ImRecord<BuildClient>(
	{
		name: '',
		generator: GeneratorRecord(),
		templateVersion: {
			path: '',
			version: '',
			config: TemplateConfigRecord(),
		},
		template: {
			name: '',
			root: '',
		},
		templateConfig: TemplateConfigRecord(),
		workspace: undefined,
	},
	'ClientRecord',
) {
	get oasGenerator(): OASGeneratorRecord {
		return OASGeneratorRecord(this.generator)
	}

	get oasConfig(): OASRecord {
		return OASRecord().mergeDeepIn(
			['generator-cli', 'generators', this.name],
			this.oasGenerator,
		) as OASRecord
	}
}

export interface ClientRecord extends RecordOf<BuildClient> {
	oasGenerator: OASGeneratorRecord
	oasConfig: OASRecord
}

export type Builder = (options: BuildOptions) => BuildOptions

export type GeneratorBuilder = <OptionsT extends Template = Template>(
	name: string,
	options: OptionsT,
) => {
	defineClient<VT extends keyof OptionsT['versions']>(
		version: VT,
		options: Omit<BuildOptions, 'templates'> & {
			generators: Record<
				string,
				SetOptional<
					BuildOptions['generators'][string],
					'generatorName' | 'generatorVersion'
				>
			>
		},
	): BuildOptions
}

export const defineGenerator: GeneratorBuilder = (name, options) => {
	const templateOptions = options
	const templates: Record<string, Template> = {[name]: templateOptions}
	return {
		defineClient(version, options) {
			const clientDefaults: Partial<ExtendedGeneratorConfig> = {
				generatorVersion: version.toString(),
				generatorName: templateOptions.name,
			}
			const clientGens = objectMap(options.generators, (key, value) => [
				key,
				GeneratorRecord()
					.mergeDeep(clientDefaults)
					.mergeDeep(value as ExtendedGeneratorConfig)
					.toJS() as ExtendedGeneratorConfig,
			])
			return defineClients({templates, ...options, generators: clientGens})
		},
	}
}

export const defineClients: Builder = (options: BuildOptions): BuildOptions => {
	return options
}
