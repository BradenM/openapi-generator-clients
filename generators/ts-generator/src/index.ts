import {fileURLToPath} from 'node:url'
import {defineGenerator} from '@openapi-generator-clients/config'

export default defineGenerator('ts-generator', {
	name: 'typescript',
	baseRef: '8c57b66da90bdf1d5a9a7d3588458731f0dec078',
	latest: 'v1',
	rootDir: fileURLToPath(new URL('generators', import.meta.url)),
	versions: {
		v1: {
			generatorVersion: 'v1',
			drop: ['git_push.sh'],
			additionalArgs: [],
			additionalProperties: {
				disallowAdditionalPropertiesIfNotPresent: false,
				legacyDiscriminatorBehavior: false,
				platform: 'node',
				supportsES6: true,
				useObjectParameters: true,
			},
		},
	},
})
