/// <reference path="./types.ts" />
/// <reference path="./tree.ts" />
/// <reference path="./bird.ts" />

namespace Jamble {
  export function registerCoreElements(registry: LevelElementRegistry, hostResolvers: {
    ensureTreeDom(label: string): HTMLElement;
    ensureCeilingTreeDom(id: string): HTMLElement;
    ensureBirdDom(id: string): HTMLElement;
  }): void {
    registry.register({
      id: 'tree.basic',
      name: 'Tree',
      type: 'tree',
      defaults: {},
      create: ({ id, host }) => {
        const labelMatch = id.match(/(\d+)/);
        const label = labelMatch ? labelMatch[1] : id;
        const el = host || hostResolvers.ensureTreeDom(label);
        return new TreeElement(id, el, 'ground');
      }
    });

    registry.register({
      id: 'tree.ceiling',
      name: 'Tree Ceiling',
      type: 'tree_ceiling',
      defaults: {},
      create: ({ id, host }) => {
        const el = host || hostResolvers.ensureCeilingTreeDom(id);
        return new TreeElement(id, el, 'ceiling');
      }
    });

    registry.register({
      id: 'bird.basic',
      name: 'Bird',
      type: 'bird',
      defaults: {},
      create: ({ id, host }) => {
        const el = host || hostResolvers.ensureBirdDom(id);
        return new BirdElement(id, el);
      }
    });
  }
}
