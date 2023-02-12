import crypto from 'node:crypto'
import path from 'node:path'
import type buffer from 'node:buffer'
import fse from 'fs-extra'
import consola from 'consola'

export async function createFileChecksum(
	filePath: string,
	algo = 'md5',
): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const hash = crypto.createHash(algo)
		const stream = fse.createReadStream(filePath)
		stream.on('readable', () => {
			const data: buffer.Buffer = stream.read() as buffer.Buffer
			if (data) {
				const stripped = data
					.toString()
					.split('\n')
					.map((l) => l.trim().replace(' ', 'spl'))
					.join('')
				hash.update(stripped)
			} else {
				const result = hash.digest('hex')
				consola.debug(
					`generated (${algo}) xsum: ${result} for ${path.basename(filePath)}`,
				)
				stream.close(reject)
				resolve(result)
			}
		})
	})
}
