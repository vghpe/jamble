namespace Jamble {
  export type LevelElementType = 'tree' | 'tree_ceiling' | 'bird' | 'empty';
  export type ElementHostKind = 'tree-ground' | 'tree-ceiling' | 'bird-floating';
  export type SlotType = 'ground' | 'air_low' | 'air_mid' | 'air_high' | 'ceiling';

  export interface LevelElementLifecycleContext {
    manager: LevelElementManager;
  }

  export interface LevelElementTickContext {
    manager: LevelElementManager;
    deltaMs: number;
  }

  export interface LevelElementCollisionContext {
    manager: LevelElementManager;
  }

  export type ElementOriginUnit = 'fraction' | 'px';

  export interface ElementOrigin {
    x: number;
    y: number;
    xUnit?: ElementOriginUnit;
    yUnit?: ElementOriginUnit;
  }

  export interface LevelElement {
    readonly id: string;
    readonly type: LevelElementType;
    readonly el: HTMLElement;
    readonly collidable: boolean;
    rect(): DOMRect;
    init?(ctx: LevelElementLifecycleContext): void;
    activate?(ctx: LevelElementLifecycleContext): void;
    deactivate?(ctx: LevelElementLifecycleContext): void;
    tick?(ctx: LevelElementTickContext): void;
    onCollision?(ctx: LevelElementCollisionContext): void;
    dispose?(ctx: LevelElementLifecycleContext): void;
    getOrigin?(): ElementOrigin | null;
  }

  export interface PositionableLevelElement extends LevelElement {
    setLeftPct(pct: number): void;
  }

  export function isPositionableLevelElement(el: LevelElement): el is PositionableLevelElement {
    return typeof (el as PositionableLevelElement).setLeftPct === 'function';
  }

  export interface LevelElementDescriptor<TConfig = any> {
    id: string;
    name: string;
    emoji: string;
    type: LevelElementType;
    hostKind: ElementHostKind;
    defaults?: TConfig;
    ensureHost?: (root: HTMLElement, id: string) => HTMLElement;
    create: (options: LevelElementFactoryOptions<TConfig>) => LevelElement;
    placement?: ElementPlacementOptions;
  }

  export interface LevelElementFactoryOptions<TConfig = any> {
    id: string;
    manager: LevelElementManager;
    root: HTMLElement;
    config: TConfig;
    host?: HTMLElement;
  }

  export interface LevelElementCreateOptions<TConfig = any> {
    manager: LevelElementManager;
    root: HTMLElement;
    config?: TConfig;
    host?: HTMLElement;
    instanceId?: string;
  }

  export interface NeighborBlockRule {
    types: LevelElementType[];
    distance: number;
  }

  export interface ElementPlacementOptions {
    validSlotTypes: SlotType[];
    blockedNeighbors?: NeighborBlockRule;
    allowStartZone?: boolean;
  }

  export class LevelElementRegistry {
    private descriptors = new Map<string, LevelElementDescriptor<any>>();

    register<TConfig = any>(desc: LevelElementDescriptor<TConfig>): void {
      this.descriptors.set(desc.id, desc as LevelElementDescriptor<any>);
    }

    unregister(id: string): void {
      this.descriptors.delete(id);
    }

    get<TConfig = any>(id: string): LevelElementDescriptor<TConfig> | undefined {
      return this.descriptors.get(id) as LevelElementDescriptor<TConfig> | undefined;
    }

    create<TConfig = any>(elementId: string, options: LevelElementCreateOptions<TConfig>): LevelElement | undefined {
      const desc = this.descriptors.get(elementId) as LevelElementDescriptor<TConfig> | undefined;
      if (!desc) return undefined;
      const cfg = (options.config !== undefined ? options.config : desc.defaults) as TConfig;
      const instId = options.instanceId || elementId;
      const host = options.host || (desc.ensureHost ? desc.ensureHost(options.root, instId) : undefined);
      const factoryOptions: LevelElementFactoryOptions<TConfig> = {
        id: instId,
        manager: options.manager,
        root: options.root,
        host,
        config: cfg
      };
      return desc.create(factoryOptions);
    }
  }
}
