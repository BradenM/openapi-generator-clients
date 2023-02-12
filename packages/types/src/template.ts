import type {PartialOnUndefinedDeep} from 'type-fest'
import type {TemplateConfig} from './generator'

export interface Template {
	name: string
	baseRef: string
	versions: Record<string, PartialOnUndefinedDeep<TemplateConfig>>
	latest: string
}
