#!/usr/bin/env node
import minimist from 'minimist'
import path from 'pathe'
import consola from 'consola'
import {build} from './build'

async function main() {
	const argv = minimist(process.argv.slice(2))
	const rootDir = path.resolve(process.cwd(), argv._[0] ?? '.')
	await build(rootDir).catch((error: unknown) => {
		consola.error(`Error (${rootDir}):`, error)
		throw error
	})
}

try {
	await main()
} catch (error: unknown) {
	consola.error(error)
	process.exit(1)
}
