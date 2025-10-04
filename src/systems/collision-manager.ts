/// <reference path="../core/game-object.ts" />

/**
 * CollisionManager
 *
 * Extremely small, single-pass collision system tailored for this game.
 * Responsibilities:
 * - Compute world-space AABBs from each object's transform + collider anchor.
 * - Resolve intersections between dynamic actors (player) and solid environment.
 * - Clamp actors to world bounds (left/right walls and bottom ground).
 * - Drive simple trigger interactions (enter/stay/exit) for non‑blocking colliders.
 *
 * Design choices kept intentionally simple:
 * - No broadphase structure (entity counts are tiny).
 * - One dynamic category ('player'), one solid ('environment'), and triggers
 *   ('kinematic' | 'deadly').
 * - Grounded state is derived after resolution using an epsilon check so it
 *   remains true while resting exactly on a surface.
 */

namespace Jamble {
  export class CollisionManager {
    private prevTriggerPairs: Set<string> = new Set();
    constructor(private gameWidth: number, private gameHeight: number) {}

    update(gameObjects: GameObject[]): void {
      // Partition colliders by category. Keep it flat and tiny.
      const dynamics: GameObject[] = [];
      const solids: GameObject[] = [];
      const triggers: GameObject[] = [];

      const byId = new Map<string, GameObject>();
      for (const obj of gameObjects) byId.set(obj.id, obj);

      for (const obj of gameObjects) {
        if (!obj.collisionBox) continue;
        const cat = obj.collisionBox.category;
        if (cat === 'player') dynamics.push(obj);
        if (cat === 'environment') solids.push(obj);
        if (cat === 'kinematic' || cat === 'deadly') triggers.push(obj);
      }

      // 1) Resolve against solids, then clamp to world
      for (const dyn of dynamics) {
        if (!dyn.collisionBox) continue;

        // Resolve vs static solids (minimal translation along the smallest axis)
        for (const solid of solids) {
          if (dyn === solid || !solid.collisionBox) continue;
          this.resolveAABB(dyn, solid);
        }

        // Clamp to world edges and bottom ground using collider
        this.clampToWorld(dyn);

        // 2) Derive grounded state after all resolution/clamping
        //    Use a small epsilon so it stays true while resting exactly on surfaces
        const pb = this.getAABB(dyn);
        const eps = 0.001;
        let grounded = false;
        // World ground contact
        if (pb.y + pb.height >= this.gameHeight - eps) {
          grounded = true;
        } else {
          // Check top faces of solids directly beneath
          for (const solid of solids) {
            if (!solid.collisionBox) continue;
            const ob = this.getAABB(solid);
            const horizontalOverlap = pb.x < ob.x + ob.width && pb.x + pb.width > ob.x;
            const touchingTop = Math.abs((pb.y + pb.height) - ob.y) <= eps;
            const vy = (dyn as any).velocityY ?? 0;
            if (horizontalOverlap && touchingTop && vy >= 0) {
              grounded = true;
              break;
            }
          }
        }
        if ((dyn as any).grounded !== undefined) {
          (dyn as any).grounded = grounded;
        }
      }

      // 3) Trigger handling (enter/stay/exit) for non‑blocking overlaps
      const currentPairs: Set<string> = new Set();
      for (const dyn of dynamics) {
        if (!dyn.collisionBox) continue;
        for (const other of triggers) {
          if (!other.collisionBox) continue;
          if (dyn === other) continue;
          if (this.aabbIntersects(dyn, other)) {
            const key = `${dyn.id}|${other.id}`;
            currentPairs.add(key);
            if (!this.prevTriggerPairs.has(key)) {
              // Enter
              other.onTriggerEnter?.(dyn);
              dyn.onTriggerEnter?.(other);
            } else {
              // Stay
              other.onTriggerStay?.(dyn);
              dyn.onTriggerStay?.(other);
            }
          }
        }
      }

      // Exits: anything that was present last frame but not now
      for (const key of this.prevTriggerPairs) {
        if (!currentPairs.has(key)) {
          const [dynId, otherId] = key.split('|');
          const dyn = byId.get(dynId);
          const other = byId.get(otherId);
          if (dyn && other) {
            other.onTriggerExit?.(dyn);
            dyn.onTriggerExit?.(other);
          }
        }
      }

      this.prevTriggerPairs = currentPairs;
    }

    // Simple overlap test using derived AABBs
    private aabbIntersects(a: GameObject, b: GameObject): boolean {
      const A = this.getAABB(a);
      const B = this.getAABB(b);
      return (
        A.x < B.x + B.width &&
        A.x + A.width > B.x &&
        A.y < B.y + B.height &&
        A.y + A.height > B.y
      );
    }

    // Derive collider top-left from transform and anchor
    private getAABB(obj: GameObject) {
      const cb = obj.collisionBox!;
      const ax = cb.anchor?.x ?? 0;
      const ay = cb.anchor?.y ?? 0;
      const x = obj.transform.x - ax * cb.width;
      const y = obj.transform.y - ay * cb.height;
      return { x, y, width: cb.width, height: cb.height };
    }

    // Keep collider.x/y up to date for any consumers that read it directly
    private setColliderTopLeft(obj: GameObject, x: number, y: number) {
      if (!obj.collisionBox) return;
      obj.collisionBox.x = x;
      obj.collisionBox.y = y;
    }

    // Minimal-translation resolution between a dynamic and a solid box
    private resolveAABB(dyn: GameObject, solid: GameObject) {
      const pb = this.getAABB(dyn);
      const ob = this.getAABB(solid);

      // Broad-phase AABB test
      const intersects = (
        pb.x < ob.x + ob.width &&
        pb.x + pb.width > ob.x &&
        pb.y < ob.y + ob.height &&
        pb.y + pb.height > ob.y
      );
      if (!intersects) return;

      // Compute minimal translation
      const pushLeft = (pb.x + pb.width) - ob.x;      // move player left
      const pushRight = (ob.x + ob.width) - pb.x;     // move player right
      const pushUp = (pb.y + pb.height) - ob.y;       // move player up
      const pushDown = (ob.y + ob.height) - pb.y;     // move player down

      const minPushX = Math.min(pushLeft, pushRight);
      const minPushY = Math.min(pushUp, pushDown);

      if (minPushX < minPushY) {
        const dx = (pushLeft < pushRight) ? -pushLeft : pushRight;
        dyn.transform.x += dx;
        this.setColliderTopLeft(dyn, pb.x + dx, pb.y);
        // Zero horizontal velocity if known fields exist
        if ((dyn as any).velocityX !== undefined) {
          (dyn as any).velocityX = 0;
        }
      } else {
        const dy = (pushUp < pushDown) ? -pushUp : pushDown;
        dyn.transform.y += dy;
        this.setColliderTopLeft(dyn, pb.x, pb.y + dy);
        if ((dyn as any).velocityY !== undefined) {
          (dyn as any).velocityY = 0;
        }
      }
    }

    // Clamp to world left/right and bottom ground using the collider AABB
    private clampToWorld(obj: GameObject) {
      if (!obj.collisionBox) return;
      const pb = this.getAABB(obj);
      let dx = 0;
      if (pb.x < 0) {
        dx = -pb.x;
      } else if (pb.x + pb.width > this.gameWidth) {
        dx = this.gameWidth - (pb.x + pb.width);
      }
      if (dx !== 0) {
        obj.transform.x += dx;
        this.setColliderTopLeft(obj, pb.x + dx, pb.y);
        if ((obj as any).velocityX !== undefined) {
          (obj as any).velocityX = 0;
        }
      }

      // Bottom ground clamp (do not clamp top)
      const pb2 = this.getAABB(obj);
      if (pb2.y + pb2.height > this.gameHeight) {
        const dy = this.gameHeight - (pb2.y + pb2.height);
        obj.transform.y += dy;
        this.setColliderTopLeft(obj, pb2.x, pb2.y + dy);
        if ((obj as any).velocityY !== undefined) {
          (obj as any).velocityY = 0;
        }
      }
    }
  }
}
