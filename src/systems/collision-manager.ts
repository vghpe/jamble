/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class CollisionManager {
    constructor(private gameWidth: number, private gameHeight: number) {}

    update(gameObjects: GameObject[]): void {
      const dynamics: GameObject[] = [];
      const solids: GameObject[] = [];

      for (const obj of gameObjects) {
        if (!obj.collisionBox) continue;
        const cat = obj.collisionBox.category;
        if (cat === 'player') dynamics.push(obj);
        if (cat === 'environment') solids.push(obj);
      }

      for (const dyn of dynamics) {
        if (!dyn.collisionBox) continue;

        // Resolve vs static solids
        for (const solid of solids) {
          if (dyn === solid || !solid.collisionBox) continue;
          this.resolveAABB(dyn, solid);
        }

        // Clamp to world edges using collider
        this.clampToWorld(dyn);
      }
    }

    private getAABB(obj: GameObject) {
      const cb = obj.collisionBox!;
      const ax = cb.anchor?.x ?? 0;
      const ay = cb.anchor?.y ?? 0;
      const x = obj.transform.x - ax * cb.width;
      const y = obj.transform.y - ay * cb.height;
      return { x, y, width: cb.width, height: cb.height };
    }

    private setColliderTopLeft(obj: GameObject, x: number, y: number) {
      if (!obj.collisionBox) return;
      obj.collisionBox.x = x;
      obj.collisionBox.y = y;
    }

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
        // Mark grounded on upward resolution (landed on top)
        if (dy < 0 && (dyn as any).grounded !== undefined) {
          (dyn as any).grounded = true;
        }
      }
    }

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
    }
  }
}

