export interface GitConfig {
	gitHost: string
	gitUserId: string
	gitRepoId: string
}

export interface GeneratorProps {
	[key: string]: string | boolean | undefined
	useRxJS6: boolean | string | undefined
	usePromise: boolean | string | undefined
	supportsES6: boolean | string | undefined
	withInterfaces: boolean | string | undefined

	useInversify: boolean | undefined
	useObjectParameters: boolean | undefined
	legacyDiscriminatorBehavior: boolean | undefined
	platform: 'node' | 'deno' | 'browser' | undefined
	disallowAdditionalPropertiesIfNotPresent: boolean | undefined
	npmName: string | undefined
}

export interface GeneratorConfig extends GitConfig {
	additionalProperties: GeneratorProps
	generatorName: string | undefined
	templateDir?: string | undefined
	output: string
	glob: string | undefined
	inputSpec: string | undefined
	removeOperationIdPrefix: boolean
	legacyDiscriminatorBehavior: boolean
}

export interface TemplateConfig {
	generatorVersion?: string | undefined
	additionalArgs: string[]
	drop?: string[]
}

export interface ExtendedGeneratorConfig
	extends GeneratorConfig,
		TemplateConfig {}

export interface OASConfig {
	$schema?: string
	spaces?: number
	'generator-cli': {
		version: string
		generators: Record<string, GeneratorConfig>
	}
}

export interface TemplatesConfig {
	extends: string
	drop?: string[]
}

export interface GenerateOptions {
	clients: string[]
	rootDir: string
	overwrite?: boolean
	additionalArgs?: string[]
	workspaceProvider?: WorkspaceProvider
}

export interface Workspace {
	rootPath: string

	templatesPath: string

	configPath: string

	outputPath: string
}

export interface WorkspaceProvider<T extends Workspace = Workspace> {
	workspace: T
	create(outputDir: string, overwrite?: boolean): Promise<this>

	addTemplatePath(path: string, ...args: any[]): Promise<this>
	setConfig(config: GeneratorConfig): Promise<this>
}
