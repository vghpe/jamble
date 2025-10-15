/// <reference path="line-graph-panel.ts" />
/// <reference path="heart-rate-panel.ts" />
/// <reference path="sensation-panel.ts" />

namespace Jamble {
  /**
   * MonitorPanel orchestrates the heart-rate (legacy activity) and sensation graphs.
   * It owns a flex column container that splits the allotted height evenly
   * between both child panels.
   */
  export class MonitorPanel {
    private container: HTMLElement;
    private heartRatePanel: HeartRatePanel;
    private sensationPanel: SensationPanel;
    private width: number;
    private height: number;

    constructor(parent: HTMLElement, width: number, height: number) {
      this.width = width;
      this.height = height;

      this.container = document.createElement('div');
      this.container.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        flex: 1;
        display: flex;
        flex-direction: row;
        justify-content: stretch;
        align-items: stretch;
        gap: 2px;
        pointer-events: none;
      `;

      parent.appendChild(this.container);

      const halfWidth = Math.floor(width / 2);
      const secondWidth = width - halfWidth;

      this.heartRatePanel = new HeartRatePanel(this.container, halfWidth, height, {
        strokeStyle: '#757575'
      });

      this.sensationPanel = new SensationPanel(this.container, secondWidth, height, {
        strokeStyle: '#59a869',
        initialValue: 0.2
      });
    }

    update(deltaTime: number): void {
      this.heartRatePanel.update(deltaTime);
      this.sensationPanel.update(deltaTime);
    }

    render(): void {
      this.heartRatePanel.render();
      this.sensationPanel.render();
    }

    pushData(value: number): void {
      this.heartRatePanel.pushData(value);
    }

    /**
     * Set the sensation value (0-1 normalized) from external source (e.g., NPC)
     */
    setSensationValue(value: number): void {
      this.sensationPanel.setValue(value);
    }

    /**
     * Get the current sensation value
     */
    getSensationValue(): number {
      return this.sensationPanel.getValue();
    }

    // Debug accessors (legacy API passthroughs)
    getSampleSpacing(): number {
      return this.heartRatePanel.getSampleSpacing();
    }

    getScrollSpeed(): number {
      return this.heartRatePanel.getScrollSpeed();
    }

    getFrequency(): number {
      return this.heartRatePanel.getFrequency();
    }

    getAmplitude(): number {
      return this.heartRatePanel.getAmplitude();
    }

    getSmoothing(): number {
      return this.heartRatePanel.getSmoothing();
    }

    setSampleSpacing(value: number): void {
      this.heartRatePanel.setSampleSpacing(value);
      this.sensationPanel.setSampleSpacing(value);
    }

    setScrollSpeed(value: number): void {
      this.heartRatePanel.setScrollSpeed(value);
      this.sensationPanel.setScrollSpeed(value);
    }

    setFrequency(value: number): void {
      this.heartRatePanel.setFrequency(value);
    }

    setAmplitude(value: number): void {
      this.heartRatePanel.setAmplitude(value);
    }

    setSmoothing(value: number): void {
      this.heartRatePanel.setSmoothing(value);
      this.sensationPanel.setSmoothing(value);
    }
  }
}
