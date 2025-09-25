/// <reference path="../elements/types.ts" />
/// <reference path="../elements/tree.ts" />
/// <reference path="../elements/bird.ts" />
/// <reference path="../elements/knob.ts" />

namespace Jamble {
  type CoreElementDescriptor<TCfg = any> = LevelElementDescriptor<TCfg> & {
    emoji: string;
  };

  const hostFactories: Record<ElementHostKind, (root: HTMLElement, id: string) => HTMLElement> = {
    'tree-ground': (root, id) => {
      let el = root.querySelector('.jamble-tree[data-element-id="' + id + '"]') as HTMLElement | null;
      if (el) return el;
      el = document.createElement('div');
      el.className = 'jamble-tree';
      root.appendChild(el);
      el.setAttribute('data-element-id', id);
      if (!el.style.left) el.style.left = '50%';
      el.style.display = 'none';
      return el;
    },
    'tree-ceiling': (root, id) => {
      let el = root.querySelector('.jamble-tree.jamble-tree-ceiling[data-element-id="' + id + '"]') as HTMLElement | null;
      if (el) return el;
      el = document.createElement('div');
      el.className = 'jamble-tree jamble-tree-ceiling';
      root.appendChild(el);
      el.classList.add('jamble-tree', 'jamble-tree-ceiling');
      el.setAttribute('data-element-id', id);
      if (!el.style.left) el.style.left = '50%';
      el.style.display = 'none';
      return el;
    },
    'bird-floating': (root, id) => {
      let el = root.querySelector('.jamble-bird[data-element-id="' + id + '"]') as HTMLElement | null;
      if (el) return el;
      el = document.createElement('div');
      el.className = 'jamble-bird';
      el.textContent = '🐦';
      root.appendChild(el);
      el.setAttribute('data-element-id', id);
      if (!el.style.left) el.style.left = '50%';
      el.style.display = 'none';
      return el;
    },
    'laps-control': (root, id) => {
      let el = root.querySelector('.jamble-laps[data-element-id="' + id + '"]') as HTMLElement | null;
      if (el) return el;
      el = document.createElement('div');
      el.className = 'jamble-laps';
      el.setAttribute('data-element-id', id);
      el.style.display = 'none';
      root.appendChild(el);
      return el;
    },
    'knob-interactive': (root, id) => {
      let el = root.querySelector('.jamble-knob[data-element-id="' + id + '"]') as HTMLElement | null;
      if (el) return el;
      el = document.createElement('div');
      el.className = 'jamble-knob';
      el.setAttribute('data-element-id', id);
      if (!el.style.left) el.style.left = '50%';
      el.style.display = 'none';
      root.appendChild(el);
      return el;
    }
  };

  const CORE_ELEMENTS: CoreElementDescriptor[] = [
    {
      id: 'laps.basic',
      name: 'Laps',
      emoji: '🔁',
      type: 'laps',
      hostKind: 'laps-control',
      defaults: { value: 1 } as LapsElementConfig,
      ensureHost: (root, id) => hostFactories['laps-control'](root, id),
      create: ({ id, host, root, config }) => {
        const el = host || hostFactories['laps-control'](root, id);
        return new LapsElement(id, el, config as LapsElementConfig | undefined);
      }
    },
    {
      id: 'tree.basic',
      name: 'Tree',
      emoji: '🌳',
      type: 'tree',
      hostKind: 'tree-ground',
      defaults: {},
      placement: { validSlotTypes: ['ground'], blockedNeighbors: { types: ['tree'], distance: 1 }, allowStartZone: false },
      ensureHost: (root, id) => hostFactories['tree-ground'](root, id),
      create: ({ id, host, root }) => {
        const el = host || hostFactories['tree-ground'](root, id);
        return new TreeElement(id, el, 'ground');
      }
    },
    {
      id: 'tree.ceiling',
      name: 'Ceiling Tree',
      emoji: '🌲',
      type: 'tree_ceiling',
      hostKind: 'tree-ceiling',
      defaults: {},
      placement: { validSlotTypes: ['ceiling'], blockedNeighbors: { types: ['tree_ceiling'], distance: 1 }, allowStartZone: true },
      ensureHost: (root, id) => hostFactories['tree-ceiling'](root, id),
      create: ({ id, host, root }) => {
        const el = host || hostFactories['tree-ceiling'](root, id);
        return new TreeElement(id, el, 'ceiling');
      }
    },
    {
      id: 'bird.basic',
      name: 'Bird',
      emoji: '🐦',
      type: 'bird',
      hostKind: 'bird-floating',
      defaults: { speed: 40, direction: 1 } as BirdElementConfig,
      placement: { validSlotTypes: ['air_low', 'air_mid'], blockedNeighbors: { types: ['bird'], distance: 1 }, allowStartZone: true },
      ensureHost: (root, id) => hostFactories['bird-floating'](root, id),
      create: ({ id, host, root, config }) => {
        const el = host || hostFactories['bird-floating'](root, id);
        return new BirdElement(id, el, config as BirdElementConfig | undefined);
      }
    },
    {
      id: 'bird.fast',
      name: 'Fast Bird',
      emoji: '🐦‍⬛', // Different emoji for visual distinction
      type: 'bird',
      hostKind: 'bird-floating',
      defaults: { speed: 60, direction: 1 } as BirdElementConfig,
      placement: { validSlotTypes: ['air_low', 'air_mid'], blockedNeighbors: { types: ['bird'], distance: 1 }, allowStartZone: true },
      ensureHost: (root, id) => hostFactories['bird-floating'](root, id),
      create: ({ id, host, root, config }) => {
        const el = host || hostFactories['bird-floating'](root, id);
        return new BirdElement(id, el, config as BirdElementConfig | undefined);
      }
    },
    {
      id: 'knob.basic',
      name: 'Knob',
      emoji: '🔔',
      type: 'knob',
      hostKind: 'knob-interactive',
      defaults: {} as KnobConfig,
      placement: { validSlotTypes: ['ground'], blockedNeighbors: { types: [], distance: 0 }, allowStartZone: true },
      ensureHost: (root, id) => hostFactories['knob-interactive'](root, id),
      create: ({ id, host, root, config }) => {
        const el = host || hostFactories['knob-interactive'](root, id);
        return new KnobElement(id, el, config as Partial<KnobConfig> | undefined);
      }
    }
  ];

  export function registerCoreElements(registry: LevelElementRegistry): void {
    CORE_ELEMENTS.forEach(desc => registry.register(desc));
  }

  export function getCoreElementDefinition(id: string): CoreElementDescriptor | undefined {
    return CORE_ELEMENTS.find(def => def.id === id);
  }

  export function getCoreElementDefinitions(): ReadonlyArray<CoreElementDescriptor> {
    return CORE_ELEMENTS;
  }

}
