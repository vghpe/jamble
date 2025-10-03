/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Renderer {
    private gameElement: HTMLElement;
    private objectElements: Map<string, HTMLElement> = new Map();

    constructor(gameElement: HTMLElement) {
      this.gameElement = gameElement;
    }

    render(gameObjects: GameObject[]) {
      // Clear existing elements that no longer exist
      const currentIds = new Set(gameObjects.map(obj => obj.id));
      for (const [id, element] of this.objectElements) {
        if (!currentIds.has(id)) {
          element.remove();
          this.objectElements.delete(id);
        }
      }

      // Render each game object
      gameObjects.forEach(obj => {
        if (!obj.render.visible) return;

        let element = this.objectElements.get(obj.id);
        if (!element) {
          element = document.createElement('div');
          element.style.position = 'absolute';
          element.style.fontSize = '16px';
          element.style.userSelect = 'none';
          element.style.pointerEvents = 'none';
          this.gameElement.appendChild(element);
          this.objectElements.set(obj.id, element);
        }

        // Update position and appearance
        element.style.left = obj.transform.x + 'px';
        element.style.bottom = (100 - obj.transform.y - obj.transform.height) + 'px';
        element.style.width = obj.transform.width + 'px';
        element.style.height = obj.transform.height + 'px';
        
        if (obj.render.emoji) {
          element.textContent = obj.render.emoji;
        } else {
          element.textContent = '';
          element.style.backgroundColor = obj.render.color || '#888';
        }
      });
    }

    clear() {
      for (const element of this.objectElements.values()) {
        element.remove();
      }
      this.objectElements.clear();
    }
  }
}