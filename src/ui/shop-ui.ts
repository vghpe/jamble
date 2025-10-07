/// <reference path="../systems/shop-manager.ts" />
/// <reference path="../systems/state-manager.ts" />

namespace Jamble {
  export class ShopUI {
    private container: HTMLElement = document.createElement('div');
    private isVisible: boolean = false;
    private shopManager: ShopManager;
    private stateManager: StateManager | null = null;

    constructor() {
      this.shopManager = ShopManager.getInstance();
      this.createShopContainer();
      this.setupStyles();
      this.setupResizeListener();
    }

    setStateManager(stateManager: StateManager): void {
      this.stateManager = stateManager;
    }

    private createShopContainer(): void {
      this.container.id = 'shop-container';
      this.container.className = 'shop-container hidden';

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

      document.body.appendChild(this.container);
    }

    private setupStyles(): void {
      const style = document.createElement('style');
      style.textContent = `
        .shop-container {
          position: fixed;
          display: grid;
          grid-template-columns: repeat(4, 50px);
          grid-template-rows: repeat(2, 50px);
          gap: 12px;
          width: max-content;
          z-index: 1000;
        }

        .shop-container.hidden {
          display: none;
        }

        .shop-item {
          width: 50px;
          height: 50px;
          background: #9e9e9e;
          cursor: pointer;
          position: relative;
          margin: 0 auto;
        }

        .shop-item.owned {
          background: #4a4;
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
        }
      `;
      document.head.appendChild(style);
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

    public show(): void {
      if (!this.isVisible) {
        this.isVisible = true;
        this.container.classList.remove('hidden');
        this.reposition();
      }
    }

    public hide(): void {
      if (this.isVisible) {
        this.isVisible = false;
        this.container.classList.add('hidden');
      }
    }

    private setupResizeListener(): void {
      const handler = () => {
        if (this.isVisible) this.reposition();
      };
      window.addEventListener('resize', handler, { passive: true });
      window.addEventListener('scroll', handler, { passive: true });
    }

    public update(): void {
      if (!this.stateManager) return;
      
      const currentState = this.stateManager.getCurrentState();
      
      if (currentState === 'idle') {
        this.show();
      } else {
        this.hide();
      }
    }

    private reposition(): void {
      const gameRoot = document.getElementById('jamble-game');
      if (!gameRoot) return;

      const rect = gameRoot.getBoundingClientRect();
      const containerWidth = this.container.offsetWidth || 0;
      const left = rect.left + rect.width / 2 - containerWidth / 2;
      const top = rect.bottom + 16;

      this.container.style.left = `${left}px`;
      this.container.style.top = `${top}px`;
    }
  }
}
