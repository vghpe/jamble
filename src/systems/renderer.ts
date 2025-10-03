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

        // Update position and size
        element.style.left = obj.transform.x + 'px';
        element.style.bottom = (100 - obj.transform.y - obj.transform.height) + 'px';
        element.style.width = obj.transform.width + 'px';
        element.style.height = obj.transform.height + 'px';
        
        // Apply visual styling based on render type
        if (obj.render.type === 'css-shape' && obj.render.cssShape) {
          element.textContent = ''; // Clear any text content
          element.innerHTML = ''; // Clear any HTML content
          element.style.backgroundColor = obj.render.cssShape.backgroundColor;
          element.style.borderRadius = obj.render.cssShape.borderRadius || '0';
          element.style.border = obj.render.cssShape.border || 'none';
          element.style.boxShadow = obj.render.cssShape.boxShadow || 'none';
        } else if (obj.render.type === 'emoji' && obj.render.emoji) {
          element.textContent = obj.render.emoji;
          element.innerHTML = ''; // Clear any HTML content
          element.style.backgroundColor = 'transparent';
        } else if (obj.render.type === 'element' && obj.render.element) {
          element.textContent = ''; // Clear any text content
          element.innerHTML = ''; // Clear any existing HTML
          element.style.backgroundColor = 'transparent';
          element.appendChild(obj.render.element.cloneNode(true) as HTMLElement);
        }
        
        // Apply animations
        if (obj.render.animation) {
          const scaleTransform = `scaleX(${obj.render.animation.scaleX}) scaleY(${obj.render.animation.scaleY})`;
          element.style.transform = scaleTransform;
          element.style.transition = obj.render.animation.transition || '';
          element.style.transformOrigin = 'center bottom'; // For squash/stretch animations
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