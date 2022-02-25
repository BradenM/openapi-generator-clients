import { interfaces as invInterfaces } from 'inversify'
import Immutable, { fromJS } from 'immutable'

export type AbstractServiceMap = Record<
  `AbstractObject${string}Api`,
  abstract new (...args: any[]) => any
>

export type ServiceImplMap = Record<
  `Object${string}Api`,
  new (...args: any[]) => any
>

export type ResourceFromAbstractService<T> =
  T extends `AbstractObject${infer RT}Api`
    ? RT extends string
      ? RT
      : never
    : never

export type ResourceFromServiceImpl<T> = T extends `Object${infer RT}Api`
  ? RT extends string
    ? RT
    : never
  : never

export type ResourceToAbstractServiceMap<T> = {
  [Key in keyof T as Key extends keyof AbstractServiceMap
    ? ResourceFromAbstractService<Key>
    : never]: Key
}

export type ResourceToServiceImplMap<T> = {
  [Key in keyof T as Key extends keyof ServiceImplMap
    ? ResourceFromServiceImpl<Key>
    : never]: T[Key]
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
    if (!servicesMap) throw new TypeError(`Invalid Service Map: ${servicesMap}`)
    // `fromJS` does not seem to like "Module" type objects.
    const _svcMap = Object.fromEntries(Object.entries(servicesMap))
    const values = (fromJS(_svcMap) as Immutable.Map<keyof T, T[keyof T]>)
      .toMap()
      .toSeq()
      .filter((v) => v)
      .map((svc, name) => name)
      .flip()
      // AbstractObject[Entity]Api => Entity
      .map(
        (svcName) =>
          /AbstractObject(?<name>\w+)Api/g.exec(svcName as string).groups!
            .name as ResourceFromAbstractService<typeof svcName>
      )
      .flip()
      .toObject()
    return values as ResourceToAbstractServiceMap<T>
  }

  static createResourceToImplMap<ImplT extends ServiceImplMap>(
    svcsMap: ImplT
  ): ResourceToServiceImplMap<ImplT> {
    if (!svcsMap) throw new TypeError(`Invalid Service Map: ${svcsMap}`)
    // `fromJS` does not seem to like "Module" type objects.
    const implMap = Object.fromEntries(Object.entries(svcsMap))
    const values = (
      fromJS(implMap) as Immutable.Map<keyof ImplT, ImplT[keyof ImplT]>
    )
      .toMap()
      .toSeq()
      .flip()
      .filter(
        (key) =>
          (key as string).startsWith('Object') &&
          (key as string).endsWith('Api')
      )
      .map(
        (implName) =>
          /Object(?<name>\w+)Api/g.exec(implName as string)!.groups!.name
      )
      .flip()
      .toObject()
    return values as ResourceToServiceImplMap<ImplT>
  }
}
