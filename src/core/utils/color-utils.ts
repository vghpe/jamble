namespace Jamble {
  /**
   * Color utility functions for converting between color spaces.
   */
  export class ColorUtils {
    /**
     * Convert CIELAB color space to RGB.
     * @param l Lightness (0-100)
     * @param a Green-Red axis (-128 to 127)
     * @param b Blue-Yellow axis (-128 to 127)
     * @returns RGB color as hex string
     */
    static labToRgb(l: number, a: number, b: number): string {
      // Convert LAB to XYZ
      let y = (l + 16) / 116;
      let x = a / 500 + y;
      let z = y - b / 200;

      // Apply inverse function
      x = 0.95047 * this.labInverseFunction(x);
      y = 1.00000 * this.labInverseFunction(y);
      z = 1.08883 * this.labInverseFunction(z);

      // Convert XYZ to RGB
      let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
      let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
      let b_rgb = x * 0.0557 + y * -0.2040 + z * 1.0570;

      // Apply gamma correction
      r = this.gammaCorrection(r);
      g = this.gammaCorrection(g);
      b_rgb = this.gammaCorrection(b_rgb);

      // Convert to 0-255 range and clamp
      const red = Math.round(Math.max(0, Math.min(255, r * 255)));
      const green = Math.round(Math.max(0, Math.min(255, g * 255)));
      const blue = Math.round(Math.max(0, Math.min(255, b_rgb * 255)));

      // Convert to hex
      return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    }

    /**
     * Apply inverse function for LAB to XYZ conversion.
     */
    private static labInverseFunction(t: number): number {
      const delta = 6 / 29;
      if (t > delta) {
        return Math.pow(t, 3);
      } else {
        return 3 * delta * delta * (t - 4 / 29);
      }
    }

    /**
     * Apply gamma correction for RGB conversion.
     */
    private static gammaCorrection(value: number): number {
      if (value > 0.0031308) {
        return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
      } else {
        return 12.92 * value;
      }
    }

    /**
     * Get border color by reducing lightness.
     * @param l Original lightness
     * @param a A channel value
     * @param b B channel value
     * @param lightnessReduction Amount to reduce lightness by
     */
    static getBorderColor(l: number, a: number, b: number, lightnessReduction: number = 20): string {
      return this.labToRgb(Math.max(0, l - lightnessReduction), a, b);
    }
  }
}
