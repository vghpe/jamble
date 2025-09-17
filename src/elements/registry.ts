/// <reference path="../level-elements.ts" />

namespace Jamble {
  export function registerCoreElements(registry: LevelElementRegistry, hostResolvers: {
    ensureTreeDom(label: string): HTMLElement;
    ensureBirdDom(id: string): HTMLElement;
  }): void {
    registry.register({
      id: 'tree.basic',
      name: 'Tree',
      type: 'tree',
      defaults: {},
      create: ({ id, host }) => {
        const el = host || hostResolvers.ensureTreeDom(id.replace(/[^0-9]+/g, '') || id);
        return new TreeElement(id, el);
      }
    });

    registry.register({
      id: 'bird.basic',
      name: 'Bird',
      type: 'bird',
      defaults: {},
      create: ({ id, host }) => {
        const el = host || hostResolvers.ensureBirdDom(id);
        if (!el.classList.contains('jamble-bird')) el.classList.add('jamble-bird');
        el.textContent = '🐦';
        return new BirdElement(id, el);
      }
    });
  }
}
