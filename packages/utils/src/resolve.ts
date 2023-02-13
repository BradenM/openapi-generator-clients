import process from 'node:process'
import jiti from 'jiti'
import consola from 'consola'

const createJiti = (rootDir: string = process.cwd()) =>
	jiti(rootDir, {interopDefault: true, esmResolve: true})

export const requireFrom = <T>(id: string, rootDir?: string) =>
	createJiti(rootDir)(id) as T
export const resolveFrom = (id: string, rootDir?: string) =>
	createJiti(rootDir).resolve(id)

const tryCatchModule = <T extends (...args: any[]) => any>(
	func: T,
	fallback: T extends (...args: infer ArgT) => ReturnType<T>
		? (...args: ArgT) => ReturnType<T>
		: never,
): (<RT>(...args: Parameters<T>) => RT) => {
	return (...args: Parameters<T>) => {
		try {
			return func(...args) as ReturnType<T>
		} catch (error: unknown) {
			if (
				'code' in (error as {code: string}) &&
				(error as {code: string}).code !== 'MODULE_NOT_FOUND'
			) {
				consola.error(`Failed to import:`, args, error)
			}

			// eslint-disable-next-line  @typescript-eslint/no-unsafe-return
			return fallback(...args)
		}
	}
}

export const maybeRequireFrom = tryCatchModule(requireFrom, () => ({}))
export const maybeResolveFrom = tryCatchModule(resolveFrom, (id: string) => id)
