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
      el = root.querySelector('.jamble-tree:not([data-element-id])') as HTMLElement | null;
      if (!el){
        el = document.createElement('div');
        el.className = 'jamble-tree';
        root.appendChild(el);
      }
      el.setAttribute('data-element-id', id);
      if (!el.style.left) el.style.left = '50%';
      el.style.display = 'none';
      return el;
    },
    'tree-ceiling': (root, id) => {
      let el = root.querySelector('.jamble-tree.jamble-tree-ceiling[data-element-id="' + id + '"]') as HTMLElement | null;
      if (el) return el;
      el = root.querySelector('.jamble-tree.jamble-tree-ceiling:not([data-element-id])') as HTMLElement | null;
      if (!el){
        el = document.createElement('div');
        el.className = 'jamble-tree jamble-tree-ceiling';
        root.appendChild(el);
      }
      el.classList.add('jamble-tree', 'jamble-tree-ceiling');
      el.setAttribute('data-element-id', id);
      if (!el.style.left) el.style.left = '50%';
      el.style.display = 'none';
      return el;
    },
    'bird-floating': (root, id) => {
      let el = root.querySelector('.jamble-bird[data-element-id="' + id + '"]') as HTMLElement | null;
      if (el) return el;
      el = root.querySelector('.jamble-bird:not([data-element-id])') as HTMLElement | null;
      if (!el){
        el = document.createElement('div');
        el.className = 'jamble-bird';
        root.appendChild(el);
      }
      el.setAttribute('data-element-id', id);
      if (!el.style.left) el.style.left = '50%';
      el.style.display = 'none';
      return el;
    }
  };

  const elementHostStyles: Record<ElementHostKind, string> = {
    'tree-ground': `#jamble .jamble-tree { position: absolute; bottom: 0; width: 10px; height: 30px; background: #8d6e63; border-radius: 2px; }
#jamble .jamble-tree::after { content: ""; position: absolute; bottom: 20px; left: -5px; width: 20px; height: 20px; background: #66bb6a; border-radius: 50%; }`,
    'tree-ceiling': `#jamble .jamble-tree.jamble-tree-ceiling { top: 0; bottom: auto; }
#jamble .jamble-tree.jamble-tree-ceiling::after { bottom: auto; top: 20px; }`,
    'bird-floating': `#jamble .jamble-bird { position: absolute; bottom: 60px; width: 24px; height: 24px; background: none; font-size: 24px; line-height: 24px; text-align: center; }`
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
      defaults: {},
      ensureHost: (root, id) => hostFactories['bird-floating'](root, id),
      create: ({ id, host, root }) => {
        const el = host || hostFactories['bird-floating'](root, id);
        return new BirdElement(id, el);
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

  export function getElementStyles(): string {
    const uniqueKinds = new Set<ElementHostKind>();
    CORE_ELEMENTS.forEach(def => uniqueKinds.add(def.hostKind));
    return Array.from(uniqueKinds).map(kind => elementHostStyles[kind]).join('\n');
  }
}
