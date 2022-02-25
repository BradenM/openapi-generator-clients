import { interfaces as invInterfaces } from 'inversify'
import Immutable, { fromJS } from 'immutable'

export type AbstractServiceMap = Record<
  `AbstractObject${string}Api`,
  abstract new (...args: any[]) => any
>

export type ResourceFromAbstractService<T> =
  T extends `AbstractObject${infer RT}Api`
    ? RT extends string
      ? RT
      : never
    : never

export type ResourceToAbstractServiceMap<T> = {
  [Key in keyof T as Key extends keyof AbstractServiceMap
    ? ResourceFromAbstractService<Key>
    : never]: Key
}

export interface ApiServiceBinder {
  bindAllApiServices(): void
}

export interface HasServiceBinder<
  BinderT extends ApiServiceBinder = ApiServiceBinder
> {
  readonly svcBinder: BinderT
}

export interface HasContainer {
  container: invInterfaces.Container
}

export abstract class AbstractClientServiceBinder
  implements HasServiceBinder, HasContainer
{
  abstract container: invInterfaces.Container

  abstract get svcBinder(): ApiServiceBinder

  abstract createApiServicesModule(): invInterfaces.ContainerModule

  abstract bindAllApiServices(): void

  static createResourceToServiceMap<T extends AbstractServiceMap>(
    servicesMap: T
  ): ResourceToAbstractServiceMap<T> {
    const values = (fromJS(servicesMap) as Immutable.Map<keyof T, T[keyof T]>)
      .toMap()
      .toSeq()
      .filter((v) => v)
      .map((svc, name) => name)
      .flip()
      // AbstractObject[Entity]Api => Entity
      .map(
        (svcName) =>
          (svcName as string).match(/AbstractObject(?<name>\w+)Api/g)!.groups!
            .name as ResourceFromAbstractService<typeof svcName>
      )
      .flip()
      .toObject()
    return values as ResourceToAbstractServiceMap<T>
  }
}
