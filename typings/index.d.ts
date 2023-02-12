declare module 'list-github-dir-content' {
	export interface ListGithubDirOptions {
		user: string
		repository: string
		ref?: string
		directory: string
		token?: string
		getFullData?: boolean
	}

	export interface TreeResult<T> extends Array<T> {
		truncated: boolean
	}

	export interface FullFileLinkResult {
		self: string
		git: string
		html: string
	}

	export interface FullFileResult {
		name: string
		path: string
		sha: string
		size: number
		url: string
		html_url: string
		git_url: string
		download_url: string
		type: string
		_links: FullFileLinkResult[]
	}

	export function viaContentsApi<T extends ListGithubDirOptions>(
		options: T,
	): T['getFullData'] extends true
		? Promise<FullFileResult[]>
		: Promise<string[]>

	export function viaTreesApi<T extends ListGithubDirOptions>(
		options: T,
	): T['getFullData'] extends true
		? Promise<TreeResult<any>>
		: Promise<TreeResult<string>>
}
