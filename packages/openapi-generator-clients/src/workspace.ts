import type {
	GeneratorConfig,
	Workspace,
	WorkspaceProvider,
} from '@openapi-generator-clients/types'
import {Record as ImRecord, type RecordOf} from 'immutable'
import {getTempDir} from '@openapi-generator-clients/utils'
import path from 'pathe'
import {partial} from 'rambdax'
import fse from 'fs-extra'

export const WorkspaceRecord = ImRecord<Workspace>({
	rootPath: '',
	templatesPath: '',
	configPath: '',
	outputPath: '',
})
export interface WorkspaceRecord extends RecordOf<Workspace> {}

export const temporaryWorkspaceProvider: WorkspaceProvider<WorkspaceRecord> = {
	workspace: WorkspaceRecord(),
	async create(outputDir: string, overwrite = false) {
		const root = getTempDir()
		const resolve = partial(path.resolve, [root])
		this.workspace = WorkspaceRecord({
			rootPath: root,
			templatesPath: resolve('./templates'),
			configPath: resolve('./config.json'),
			outputPath: overwrite ? outputDir : resolve(outputDir),
		})
		await fse.ensureDir(this.workspace.templatesPath)
		return this
	},
	async addTemplatePath(path: string) {
		const templatesDir = this.workspace.templatesPath
		await fse.copy(path, templatesDir, {overwrite: true, errorOnExist: false})
		return this
	},
	async setConfig(config: GeneratorConfig) {
		await fse.writeJson(this.workspace.configPath, config, {spaces: 2})
		return this
	},
}
