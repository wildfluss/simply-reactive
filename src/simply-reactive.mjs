import get from "lodash.get";
import cloneDeep from "lodash.clonedeep";

import { createSubscription } from "./utils/subscription.mjs";
import { createTargetWatcher } from "./utils/watcher.mjs";

export function simplyReactive(entities, options) {
  const data = get(entities, "data", {});
  const watch = get(entities, "watch", {});
  const methods = get(entities, "methods", {});
  const onChange = get(options, "onChange", () => {});

  const { subscribe, notify, subscribers } = createSubscription();
  const { targetWatcher, getTarget } = createTargetWatcher();

  let _data;
  const _methods = {};
  const getContext = () => ({
    data: _data,
    methods: _methods,
  });

  let callingMethod = false;
  const methodWithFlags =
    (fn) =>
    (...args) => {
      callingMethod = true;
      const result = fn(...args);
      callingMethod = false;
      return result;
    };

  // init methods before data, as methods may be used in data
  Object.entries(methods).forEach(([methodName, methodItem]) => {
    _methods[methodName] = methodWithFlags((...args) =>
      methodItem(getContext(), ...args)
    );
    Object.defineProperty(_methods[methodName], "name", { value: methodName });
  });

  _data = new Proxy(cloneDeep(data), {
    get(target, prop) {
      if (getTarget() && !callingMethod) {
        subscribe(getTarget(), { prop, value: target[prop] });
      }
      return Reflect.get(...arguments);
    },
    set(target, prop, value) {
      // if value is the same, do nothing
      if (target[prop] === value) {
        return true;
      }

      Reflect.set(...arguments);

      if (!getTarget()) {
        onChange && onChange(prop, value);
        notify(_data, prop);
      }

      return true;
    },
  });

  Object.entries(watch).forEach(([watchName, watchItem]) => {
    targetWatcher(watchName, () => {
      watchItem(getContext());
    });
  });

  const output = [_data, _methods];
  output._internal = {
    _getSubscribers() {
      return subscribers;
    },
  };

  return output;
}
