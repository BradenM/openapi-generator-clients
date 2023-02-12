import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import {slash} from '@antfu/utils'

// eslint-disable-next-line unicorn/prevent-abbreviations
export function getTempDir(): string {
	return slash(path.join(os.tmpdir(), crypto.randomUUID()))
}
