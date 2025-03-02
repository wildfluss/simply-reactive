import { getDepNames, getUpdatedDeps, depsAreEqual } from './object.mjs'

export const createSubscription = () => {
  const subscribers = {}

  const memoDependency = (target, dep) => {
    const { watcherName, fn } = target
    const { prop, value } = dep

    if (!subscribers[watcherName]) {
      subscribers[watcherName] = {
        deps: {},
        fn,
      }
    }
    subscribers[watcherName].deps[prop] = value
  }

  return {
    subscribers,
    subscribe(target, dep) {
      if (target) {
        memoDependency(target, dep)
      }
    },
    notify(data, prop) {
      Object.entries(subscribers).forEach(([watchName, { deps, fn }]) => {
        const depNames = getDepNames(deps)

        if (depNames.includes(prop)) {
          const updatedDeps = getUpdatedDeps(depNames, data)
          if (!depsAreEqual(deps, updatedDeps)) {
            subscribers[watchName].deps = updatedDeps
            fn()
          }
        }
      })
    },
  }
}
