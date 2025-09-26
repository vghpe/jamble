namespace Jamble {
  export class Wiggle {
    private playerEl: HTMLElement;
    private interval: number | null = null;
    constructor(playerEl: HTMLElement){ this.playerEl = playerEl; }
    start(x: number): void {
      let direction = 1;
      this.stop();
      this.interval = window.setInterval(() => {
        // Apply wiggle to visual-only inner element so collider is unaffected
        const offset = direction * Jamble.Settings.current.deathWiggleDistance;
        const inner = this.playerEl.querySelector('.jamble-player-inner') as HTMLElement | null;
        (inner || this.playerEl).style.setProperty('--wiggle-offset', offset + 'px');
        direction *= -1;
      }, 100);
    }
    stop(): void {
      if (this.interval !== null){
        window.clearInterval(this.interval);
        this.interval = null;
      }
      // Reset wiggle offset on inner element
      const inner = this.playerEl.querySelector('.jamble-player-inner') as HTMLElement | null;
      (inner || this.playerEl).style.setProperty('--wiggle-offset', '0px');
    }
  }
}
