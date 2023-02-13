import {defineClients} from 'openapi-generator-clients'
import tsGenerator from '@openapi-generator-clients/ts-generator'

const petstore = tsGenerator.defineClient('v1', {
	generators: {
		'petstore-v1': {
			inputSpec:
				'https://raw.githubusercontent.com/OpenAPITools/openapi-petstore/master/src/main/resources/openapi.yaml',
			output: 'clients/petstore/v1',
			gitHost: 'github.com',
			gitRepoId: 'openapi-generator-clients',
			gitUserId: 'BradenM',
			legacyDiscriminatorBehavior: false,
			removeOperationIdPrefix: true,
			additionalProperties: {
				npmName: 'petstore-client-example',
			},
			additionalArgs: [],
		},
	},
})

export default defineClients(petstore)
