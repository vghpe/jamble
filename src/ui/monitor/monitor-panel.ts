/// <reference path="line-graph-panel.ts" />
/// <reference path="heart-rate-panel.ts" />
/// <reference path="arousal-panel.ts" />

namespace Jamble {
  /**
   * MonitorPanel orchestrates the heart-rate (legacy activity) and arousal graphs.
   * It owns a flex column container that splits the allotted height evenly
   * between both child panels.
   */
  export class MonitorPanel {
    private container: HTMLElement;
    private heartRatePanel: HeartRatePanel;
    private arousalPanel: ArousalPanel;
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
        flex-direction: column;
        justify-content: stretch;
        align-items: stretch;
        gap: 2px;
        pointer-events: none;
      `;

      parent.appendChild(this.container);

      const firstPanelHeight = Math.floor(height / 2);
      const secondPanelHeight = height - firstPanelHeight;

      this.heartRatePanel = new HeartRatePanel(this.container, width, firstPanelHeight, {
        strokeStyle: '#757575'
      });

      this.arousalPanel = new ArousalPanel(this.container, width, secondPanelHeight, {
        strokeStyle: '#59a869',
        baselineValue: 0.2,
        maintainedValue: 0.85
      });
    }

    update(deltaTime: number): void {
      this.heartRatePanel.update(deltaTime);
      this.arousalPanel.update(deltaTime);
    }

    render(): void {
      this.heartRatePanel.render();
      this.arousalPanel.render();
    }

    pushData(value: number): void {
      this.heartRatePanel.pushData(value);
    }

    setBalanceMaintained(value: boolean): void {
      this.arousalPanel.setBalanceMaintained(value);
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
      this.arousalPanel.setSampleSpacing(value);
    }

    setScrollSpeed(value: number): void {
      this.heartRatePanel.setScrollSpeed(value);
      this.arousalPanel.setScrollSpeed(value);
    }

    setFrequency(value: number): void {
      this.heartRatePanel.setFrequency(value);
    }

    setAmplitude(value: number): void {
      this.heartRatePanel.setAmplitude(value);
    }

    setSmoothing(value: number): void {
      this.heartRatePanel.setSmoothing(value);
      this.arousalPanel.setSmoothing(value);
    }
  }
}
