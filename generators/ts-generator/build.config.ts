import {defineBuildConfig} from 'unbuild'

export default defineBuildConfig({
	entries: [
		'src/index',
		{
			builder: 'mkdist',
			input: 'generators',
			outDir: 'dist/generators',
			name: 'generators',
			declaration: false,
		},
	],
	declaration: true,
	clean: true,
	rollup: {
		emitCJS: true,
	},
})
