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

export const FileTemplateType = {
	Api: 'API',
	ApiDocs: 'APIDocs',
	ApiTests: 'APITests',
	Model: 'Model',
	ModelDocs: 'ModelDocs',
	ModelTests: 'ModelTests',
	SupportingFiles: 'SupportingFiles',
} as const

export type FileTemplateType =
	(typeof FileTemplateType)[keyof typeof FileTemplateType]

export interface FileTemplate {
	templateType: FileTemplateType
	destinationFilename: string
	folder?: string
}

export interface FileTemplateExtensions {
	/**
	 * Path relative to client output to write file in.
	 */
	destinationPath?: string
	sourcePath?: string
}

export interface ExtendedFileTemplate
	extends FileTemplate,
		FileTemplateExtensions {}

export interface GeneratorConfig<T extends GeneratorProps = GeneratorProps>
	extends GitConfig {
	additionalProperties?: T
	generatorName: string | undefined
	templateDir?: string | undefined
	output: string
	glob: string | undefined
	inputSpec: string | undefined
	removeOperationIdPrefix: boolean
	legacyDiscriminatorBehavior: boolean
	files?: Record<string, FileTemplate>
}

export interface TemplateConfig<T extends GeneratorProps = GeneratorProps> {
	generatorVersion?: string | undefined
	additionalProperties?: T
	additionalArgs: string[]
	drop?: string[]
	files?: Record<string, ExtendedFileTemplate>
}

export interface ExtendedGeneratorConfig<
	T extends GeneratorProps = GeneratorProps,
> extends GeneratorConfig<T>,
		TemplateConfig<T> {
	files?: TemplateConfig['files']
	addtionalProperties?: TemplateConfig['additionalProperties']
}

export interface OASConfig {
	$schema?: string
	spaces?: number
	'generator-cli': {
		version: string
		generators: Record<string, GeneratorConfig>
	}
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
