namespace Jamble {
  export class Wiggle {
    private playerEl: HTMLElement;
    private interval: number | null = null;
    constructor(playerEl: HTMLElement){ this.playerEl = playerEl; }
    start(x: number): void {
      let direction = 1;
      this.stop();
      this.interval = window.setInterval(() => {
        this.playerEl.style.left = (x + direction * Jamble.Settings.current.deathWiggleDistance) + 'px';
        direction *= -1;
      }, 100);
    }
    stop(): void { if (this.interval !== null){ window.clearInterval(this.interval); this.interval = null; } }
  }
}
