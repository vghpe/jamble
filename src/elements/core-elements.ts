/// <reference path="./types.ts" />
/// <reference path="./tree.ts" />
/// <reference path="./bird.ts" />

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
    }
  };

  const CORE_ELEMENTS: CoreElementDescriptor[] = [
    {
      id: 'tree.basic',
      name: 'Tree',
      emoji: '🌳',
      type: 'tree',
      hostKind: 'tree-ground',
      defaults: {},
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
      ensureHost: (root, id) => hostFactories['bird-floating'](root, id),
      create: ({ id, host, root, config }) => {
        const el = host || hostFactories['bird-floating'](root, id);
        return new BirdElement(id, el, config as BirdElementConfig | undefined);
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
