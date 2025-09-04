namespace Jamble {
  export class Obstacle {
    private el: HTMLElement;
    constructor(el: HTMLElement){ this.el = el; }
    rect(): DOMRect { return this.el.getBoundingClientRect(); }
  }
}

