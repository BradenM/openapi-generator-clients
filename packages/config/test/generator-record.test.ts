import {expect, it} from 'vitest'
import {
	GeneratorRecord,
	OASGeneratorRecord,
	OASRecord,
	TemplateConfigRecord,
} from '../src'

it.each`
	rec
	${GeneratorRecord}
	${TemplateConfigRecord}
	${OASGeneratorRecord}
	${OASRecord}
`('$rec.displayName inits with defaults', async ({rec}) => {
	const inst = rec()
	expect(inst.toJS()).toMatchSnapshot(rec.displayName)
})

it('OASRecord from GeneratorRecord', async (ctx) => {
	const rec = GeneratorRecord({
		drop: ['a', 'b'],
	})
	console.log(rec.toJS())
	ctx.expect(rec.toJS()).toMatchInlineSnapshot(`
    {
      "additionalArgs": [],
      "additionalProperties": {
        "disallowAdditionalPropertiesIfNotPresent": undefined,
        "legacyDiscriminatorBehavior": false,
        "npmName": undefined,
        "platform": undefined,
        "supportsES6": true,
        "useInversify": undefined,
        "useObjectParameters": undefined,
        "usePromise": true,
        "useRxJS6": true,
        "withInterfaces": true,
      },
      "drop": [
        "a",
        "b",
      ],
      "generatorName": "",
      "generatorVersion": "",
      "gitHost": "github.com",
      "gitRepoId": "",
      "gitUserId": "",
      "glob": undefined,
      "inputSpec": undefined,
      "legacyDiscriminatorBehavior": false,
      "output": "",
      "removeOperationIdPrefix": true,
      "templateDir": "",
    }
  `)
	const oas = OASRecord({
		'generator-cli': {
			generators: {
				mygenerator: OASGeneratorRecord(rec),
			},
		},
	})
	ctx.expect(oas.toJS()).toMatchInlineSnapshot(`
    {
      "$schema": "node_modules/@openapitools/openapi-generator-cli/config.schema.json",
      "generator-cli": {
        "generators": {
          "mygenerator": {
            "additionalProperties": {
              "disallowAdditionalPropertiesIfNotPresent": undefined,
              "legacyDiscriminatorBehavior": false,
              "npmName": undefined,
              "platform": undefined,
              "supportsES6": true,
              "useInversify": undefined,
              "useObjectParameters": undefined,
              "usePromise": true,
              "useRxJS6": true,
              "withInterfaces": true,
            },
            "generatorName": "",
            "gitHost": "github.com",
            "gitRepoId": "",
            "gitUserId": "",
            "glob": undefined,
            "inputSpec": undefined,
            "legacyDiscriminatorBehavior": false,
            "output": "",
            "removeOperationIdPrefix": true,
            "templateDir": "",
          },
        },
      },
      "spaces": 2,
    }
  `)
})
