import path from 'node:path'
import os from 'node:os'
import {slash, p} from '@antfu/utils'
import listGitDir from 'list-github-dir-content'
import consola from 'consola'
import fse from 'fs-extra'
import chalk from 'chalk'
import got from 'got'

interface GitDirOptions {
	ref?: string
	token?: string
	dest?: string
}

export async function downloadGitDir(
	repoOwner: string,
	repoName: string,
	repoPath: string,
	options: GitDirOptions = {},
) {
	options.ref ??= 'master'
	options.dest ??= path.join(os.tmpdir(), repoName)
	const {dest, ref, token} = options
	const destPath = slash(dest)
	const files = await listGitDir.viaContentsApi({
		token: token ?? '',
		user: repoOwner,
		repository: repoName,
		directory: repoPath,
		ref,
		getFullData: true,
	})

	await p(files).map(
		async ({download_url, path: filePath}: listGitDir.FullFileResult) => {
			const relPath = path.relative(repoPath, filePath)
			const outPath = slash(path.join(destPath, relPath))
			consola.info(
				`${chalk.bold.whiteBright(
					'Downloading file:',
				)} ${relPath} => ${outPath}`,
			)
			await fse.outputFile(outPath, await got.get(download_url).buffer())
		},
	)
}
