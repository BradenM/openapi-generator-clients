import {pathToFileURL} from 'node:url'
import type {
	BuildOptions,
	BuildTemplate,
	TemplateVersion,
} from '@openapi-generator-clients/config'
import {
	ClientRecord,
	GeneratorRecord,
	TemplateConfigRecord,
} from '@openapi-generator-clients/config'
import path from 'pathe'
import {last, objectEntries, objectKeys} from '@antfu/utils'
import type {
	ExtendedGeneratorConfig,
	GenerateOptions,
	GeneratorConfig,
	Template,
	TemplateConfig,
} from '@openapi-generator-clients/types'
import fse from 'fs-extra'
import {downloadGitDir} from '@openapi-generator-clients/utils'
import consola from 'consola'
import {execa} from 'execa'
import R from 'rambdax/immutable.js'
import {temporaryWorkspaceProvider} from './workspace'

export const buildTemplate = async (
	rootDir: string,
	name: string,
	template: Template,
): Promise<BuildTemplate> => {
	const templateRoot = path.resolve(rootDir, name)
	const templateBase = path.resolve(templateRoot, './base')
	consola.log('checking for: ', templateBase)
	if (!(await fse.exists(templateBase))) {
		await fse.ensureDir(templateBase)
		await downloadGitDir(
			'OpenAPITools',
			'openapi-generator',
			`modules/openapi-generator/src/main/resources/${template.name}`,
			{
				dest: templateBase,
				ref: template.baseRef,
				token: process.env['GITHUB_TOKEN'] ?? '',
			},
		)
	}

	const templates: Awaited<TemplateVersion[]> = await Promise.all(
		objectEntries(template.versions).map(async ([vers, template]) => {
			const templatePath = path.resolve(templateRoot, vers)
			await fse.mkdirp(templatePath)
			return {
				path: templatePath,
				version: vers,
				config: TemplateConfigRecord(template).toJS() as TemplateConfig,
			}
		}),
	)
	const latest = (templates.find((t) => t.version === template.latest) ??
		last(templates))!
	return {
		root: templateRoot,
		name: template.name,
		versions: templates,
		latest,
	}
}

export const buildClient = async (
	client: ClientRecord,
	options: GenerateOptions,
): Promise<ClientRecord> => {
	const workspaceProvider =
		options.workspaceProvider ?? temporaryWorkspaceProvider
	const overwriteDir = path.resolve(options.rootDir, client.generator.output)

	const templBase = path.resolve(client.template.root, './base')
	const templVers = client.templateVersion.path

	const workspace = await workspaceProvider
		.create(
			options.overwrite ? overwriteDir : client.generator.output,
			options.overwrite,
		)
		// Copy base templates
		.then(async (provider) => provider.addTemplatePath(templBase))
		// Copy override templates
		.then(async (provider) => provider.addTemplatePath(templVers))
		.then((provider) => provider.workspace)

	let {inputSpec} = client.generator
	if (client.generator.glob && !inputSpec) {
		inputSpec = path.resolve(client.generator.glob)
	}

	const genClient = client.set(
		'generator',
		GeneratorRecord(client.generator).merge({
			output: workspace.outputPath,
			inputSpec,
			templateDir: workspace.templatesPath,
		}),
	)
	return genClient.set(
		'workspace',
		(
			await workspaceProvider.setConfig(
				genClient.oasGenerator.toJS() as GeneratorConfig,
			)
		).workspace,
	)
}

export const updateIgnores = async (
	ignorePath: string,
	extraIgnores: string[],
) => {
	const ignoreContents = await fse.readFile(ignorePath)
	const ignores = new Set(
		ignoreContents
			.toString()
			.split('\n')
			.map((ln) => R.trim(ln)),
	)
	const newIgnores = extraIgnores.filter((drop) => !ignores.has(drop))
	if (newIgnores.length > 0) {
		await fse.writeFile(ignorePath, [ignoreContents, ...newIgnores].join('\n'))
	}
}

export const generateClient = async (client: ClientRecord) => {
	if (!client.workspace) {
		throw new Error(`Cannot generate client; it has no workspace attached!`)
	}

	const batchArgs = [
		'batch',
		`--root-dir=${client.generator.output}`,
		`--includes-base-dir=${client.generator.templateDir!}`,
		...client.templateConfig.additionalArgs,
		`--`,
		client.workspace.configPath,
	]

	consola.info('Invoking with args:', batchArgs)
	const proc = execa('openapi-generator-cli', batchArgs, {
		stdio: 'inherit',
		preferLocal: true,
		windowsHide: false,
	})

	const resolveFile = R.partial(path.resolve, [client.workspace.outputPath])
	const dropTargets = R.map(resolveFile, client.templateConfig.drop ?? [])
	const dropFile = R.tryCatchAsync<string>(
		R.pipeAsync<string>(
			R.tapAsync<string>(consola.info.bind(consola, 'Dropping file: ')),
			R.tapAsync<string>(fse.rm),
		),
		async (file: string) => {
			consola.warn(`Could not drop file: ${file}`)
			return file
		},
	)

	const fileDropper = R.mapParallelAsync(dropFile)

	try {
		await proc
		await fileDropper(dropTargets)
		consola.info('Updating ignore file with drops: ', dropTargets)
		await updateIgnores(
			resolveFile('.openapi-generator-ignore'),
			client.templateConfig.drop ?? [],
		)
	} catch (error: unknown) {
		consola.warn('Failed to generate client: ', error)
	}
}

export const build = async (rootDir: string, config?: BuildOptions) => {
	rootDir = path.resolve(process.cwd(), rootDir || '.')
	consola.info('Root dir:', rootDir)
	const configPath = pathToFileURL(
		path.resolve(rootDir, './clients.config'),
	).toString()
	config ??= (await import(configPath))?.default as BuildOptions
	consola.info('Loaded config: ', config)

	const {
		templates,
		generators,
		templatesRoot = path.resolve(rootDir, './generators'),
	} = config

	const buildTemplates = await Promise.all(
		objectEntries(templates).map(async ([name, template]) =>
			buildTemplate(templatesRoot, name, template),
		),
	)

	const buildClients = objectEntries(generators).map(([key, value]) => {
		const applicableTemplate = buildTemplates.find(
			(t) => t.name === value.generatorName,
		)
		const templateVersion =
			applicableTemplate?.versions?.find?.(
				(vers) => vers.version === value.generatorVersion,
			) ?? applicableTemplate?.latest
		if (typeof templateVersion === 'undefined') {
			throw new TypeError(
				`Generator ${value.generatorName!} version ${value.generatorVersion!} not found`,
			)
		}

		const templateCfg = TemplateConfigRecord(templateVersion.config).mergeDeep(
			TemplateConfigRecord(value),
		)
		return new ClientRecord({
			name: key,
			generator: GeneratorRecord().mergeDeep(value as ExtendedGeneratorConfig),
			templateVersion,
			template: {
				name: applicableTemplate!.name,
				root: applicableTemplate!.root,
			},
			templateConfig: templateCfg,
		})
	})

	consola.info(buildClients)

	const generateOptions: GenerateOptions = {
		rootDir,
		overwrite: true,
		clients: objectKeys(buildClients),
	}

	const workClients = await Promise.all(
		buildClients.map(async (c) => buildClient(c, generateOptions)),
	)
	consola.info('Clients:', {
		clients: workClients.map((c) => c.toJS()),
		configs: workClients.map((c) => c.oasGenerator.toJS()),
	})

	await R.mapParallelAsync(generateClient, workClients)
	consola.success('Done!')
}
