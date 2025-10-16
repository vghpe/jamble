/// <reference path="ui-component-base.ts" />
/// <reference path="../systems/shop-manager.ts" />
/// <reference path="../systems/state-manager.ts" />

namespace Jamble {
  export class ShopPanel extends UIComponent {
    private shopManager: ShopManager;
    private stateManager: StateManager | null = null;
    private shellNode: HTMLElement;

    constructor(rootElement: HTMLElement, shellElement: HTMLElement) {
      super(shellElement, { mountNode: rootElement, autoReposition: false });
      this.shellNode = shellElement;
      this.shopManager = ShopManager.getInstance();
      this.setupShopStyles();
      this.createShopItems();
    }

    setStateManager(stateManager: StateManager): void {
      this.stateManager = stateManager;
    }

    protected createContainer(): HTMLElement {
      const container = document.createElement('div');
      container.id = 'shop-panel';
      container.className = 'shop-panel';
      return container;
    }

    protected calculatePosition(_gameRect: DOMRect): { left: number; top: number } {
      return { left: 0, top: 0 };
    }

    render(): void {
      // Shop panel doesn't need per-frame rendering
      // Items are updated on purchase events
    }

    /**
     * Override show to maintain grid display instead of block
     */
    show(): void {
      if (this.isVisible) return;
      this.isVisible = true;
      this.container.style.display = 'grid';

      const shell = this.shellNode;
      if (shell.nextSibling) {
        this.mountNode.insertBefore(this.container, shell.nextSibling);
      } else {
        this.mountNode.appendChild(this.container);
      }
    }

    private setupShopStyles(): void {
      const style = document.createElement('style');
      style.textContent = `
        .shop-panel {
          position: static;
          display: grid;
          grid-template-columns: repeat(4, 50px);
          grid-template-rows: repeat(2, 50px);
          gap: 12px;
          width: max-content;
          margin: 16px auto 0;
          justify-self: center;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        .shop-panel.visible {
          opacity: 1;
          visibility: visible;
        }

        .shop-item {
          width: 50px;
          height: 50px;
          background: #9e9e9e;
          cursor: pointer;
          position: relative;
          margin: 0 auto;
          border-radius: 4px;
          transition: transform 0.1s ease, background-color 0.2s ease;
        }

        .shop-item:hover {
          transform: scale(1.05);
          background: #b0b0b0;
        }

        .shop-item.owned {
          background: #4a4;
        }

        .shop-item.owned:hover {
          background: #5b5;
        }

        .shop-item-price {
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff;
          background: transparent;
          padding: 0;
          border: none;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          pointer-events: none;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        }
      `;
      document.head.appendChild(style);
    }

    private createShopItems(): void {
      const items = this.shopManager.getAllItems();
      
      items.forEach((shopItem) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.dataset.itemId = shopItem.id;
        
        const price = document.createElement('div');
        price.className = 'shop-item-price';
        price.textContent = `$${shopItem.price}`;
        
        itemElement.appendChild(price);
        itemElement.addEventListener('click', () => this.handleItemClick(shopItem.id));
        
        this.container.appendChild(itemElement);
      });
    }

    private handleItemClick(itemId: string): void {
      const result = this.shopManager.purchaseItem(itemId);
      
      if (result.success) {
        console.log(`Purchased: ${itemId}`);
        this.updateItemDisplay(itemId);
      } else {
        console.log(`Failed: ${result.message}`);
      }
    }

    private updateItemDisplay(itemId: string): void {
      const itemElement = this.container.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
      if (itemElement) {
        itemElement.classList.add('owned');
      }
    }

    public showShop(): void {
      this.show(); // Use overridden show method
      this.container.classList.add('visible');
    }

    public hideShop(): void {
      this.container.classList.remove('visible');
      this.hide(); // Use base hide method
    }

    public updateShop(): void {
      if (!this.stateManager) return;
      
      const currentState = this.stateManager.getCurrentState();
      
      if (currentState === 'idle') {
        this.showShop();
      } else {
        this.hideShop();
      }
    }
  }
}
