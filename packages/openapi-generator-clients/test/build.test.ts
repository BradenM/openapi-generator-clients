import {vi, it, describe, expect, type SpyInstance, beforeEach} from 'vitest'
import type {
	Workspace,
	WorkspaceProvider,
} from '@openapi-generator-clients/types'
import {
	ClientRecord,
	GeneratorRecord,
	TemplateConfigRecord,
} from '@openapi-generator-clients/config'
import {buildClient} from 'openapi-generator-clients'

interface Context {
	workspaceProvider: WorkspaceProvider
	providerSpy: {
		create: SpyInstance
		addTemplatePath: SpyInstance
		setConfig: SpyInstance
	}
	inClient: ClientRecord
	workClient: ClientRecord
}

describe('buildClient', () => {
	const testWorkspace: Workspace = {
		rootPath: 'some-root',
		outputPath: 'test-output',
		configPath: 'test.config.json',
		templatesPath: 'test-templates',
	}

	beforeEach<Context>(async (ctx) => {
		ctx.workspaceProvider = {
			workspace: {...testWorkspace},
			async create() {
				return this
			},
			async addTemplatePath() {
				return this
			},
			async setConfig() {
				return this
			},
		}
		ctx.providerSpy = {
			create: vi.spyOn(ctx.workspaceProvider, 'create'),
			addTemplatePath: vi.spyOn(ctx.workspaceProvider, 'addTemplatePath'),
			setConfig: vi.spyOn(ctx.workspaceProvider, 'setConfig'),
		}
		ctx.inClient = new ClientRecord({
			name: 'test',
			generator: GeneratorRecord().mergeDeep({
				generatorVersion: 'v0',
				generatorName: 'test-generator',
				output: 'test-output',
			}),
			templateVersion: {
				version: 'v0',
				path: 'test-generator',
				config: TemplateConfigRecord().mergeDeep({generatorVersion: 'v0'}),
			},
			templateConfig: TemplateConfigRecord().merge({generatorVersion: 'v0'}),
			template: {name: 'test-template', root: 'path'},
		})
		ctx.workClient = await buildClient(ctx.inClient, {
			clients: [],
			overwrite: false,
			rootDir: '.',
			additionalArgs: [],
			workspaceProvider: ctx.workspaceProvider,
		})
	})

	it<Context>('creates expected workspace.', async (ctx) => {
		expect(ctx.workClient.toJS()).toMatchObject({
			workspace: testWorkspace,
		})
	})

	it<Context>('creates expected work client.', async (ctx) => {
		expect(ctx.workClient.toJS()).toMatchSnapshot('work client')
	})

	it<Context>('creates expected oas config.', async (ctx) => {
		expect(ctx.workClient.oasConfig.toJS()).toMatchSnapshot('oas config')
	})

	it<Context>('creates workspace and adds template paths.', async (ctx) => {
		expect(ctx.providerSpy.create).toHaveBeenCalledTimes(1)
		expect(ctx.providerSpy.addTemplatePath).toHaveBeenCalledTimes(2)
		expect(ctx.providerSpy.create.mock.lastCall).toStrictEqual([
			'test-output',
			false,
		])
		expect(ctx.providerSpy.addTemplatePath.mock.lastCall).toEqual([
			'test-generator',
		])
	})

	it<Context>('writes expected oas config to workspace config.', async (ctx) => {
		expect(ctx.providerSpy.setConfig).toHaveBeenCalledTimes(1)
		expect(ctx.providerSpy.setConfig.mock.calls).toMatchSnapshot(
			'workspace oas config.',
		)
	})
})
