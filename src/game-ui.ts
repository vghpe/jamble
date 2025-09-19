namespace Jamble {
  interface GameUiOptions {
    startButton: HTMLButtonElement;
    resetButton: HTMLButtonElement;
    skillSlots?: HTMLElement | null;
    skillMenu?: HTMLElement | null;
    elementHand?: HTMLElement | null;
    levelLabel?: HTMLElement | null;
  }

  export class GameUi {
    private startButton: HTMLButtonElement;
    private resetButton: HTMLButtonElement;
    private skillSlots: HTMLElement | null;
    private skillMenu: HTMLElement | null;
    private elementHand: HTMLElement | null;
    private levelLabel: HTMLElement | null;

    constructor(options: GameUiOptions){
      this.startButton = options.startButton;
      this.resetButton = options.resetButton;
      this.skillSlots = options.skillSlots ?? null;
      this.skillMenu = options.skillMenu ?? null;
      this.elementHand = options.elementHand ?? null;
      this.levelLabel = options.levelLabel ?? null;
    }

    getStartButton(): HTMLButtonElement {
      return this.startButton;
    }

    getResetButton(): HTMLButtonElement {
      return this.resetButton;
    }

    isControlElement(target: EventTarget | null): boolean {
      return target === this.startButton || target === this.resetButton;
    }

    showIdleControls(): void {
      this.startButton.style.display = 'block';
      if (this.skillSlots) this.skillSlots.style.display = 'flex';
      if (this.skillMenu) this.skillMenu.style.display = 'flex';
      if (this.elementHand) this.elementHand.style.display = 'flex';
    }

    hideIdleControls(): void {
      this.startButton.style.display = 'none';
      if (this.skillSlots) this.skillSlots.style.display = 'flex';
      if (this.skillMenu) this.skillMenu.style.display = 'none';
      if (this.elementHand) this.elementHand.style.display = 'none';
    }

    setResetVisible(visible: boolean): void {
      this.resetButton.style.display = visible ? 'block' : 'none';
    }

    setRunDisplay(text: string): void {
      if (!this.levelLabel) return;
      if (this.levelLabel.textContent !== text) this.levelLabel.textContent = text;
    }
  }
}
