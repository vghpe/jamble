/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Knob extends GameObject {
    // Spring physics properties
    private theta: number = 0;           // Current angle
    private thetaVelocity: number = 0;   // Angular velocity  
    private targetTheta: number = 0;     // Target angle (when deflected)
    private springK: number = 8;         // Spring constant
    private damping: number = 0.85;      // Damping factor
    
    // Physics state
    private restTheta: number = 0;       // Rest position angle
    private springLength: number = 25;   // Length of spring arm
    
    // Animation state
    private isDeflecting: boolean = false;
    private deflectionDirection: number = 1; // 1 for right, -1 for left

    constructor(id: string, x: number = 0, y: number = 0) {
      super(id, x, y);
      
      // Canvas rendering with custom knob drawing
      this.render = {
        type: 'canvas',
        visible: true,
        canvas: {
          color: '#ff6b35', // Knob color (not used directly due to custom draw)
          shape: 'custom',
          width: 60,  // Canvas area size
          height: 60,
          customDraw: this.drawKnob.bind(this)
        }
      };
      
      // Collision box for knob interaction (circular area)
      this.collisionBox = {
        x: x - 15,  // Center 30px collision box
        y: y - 15,  // Center 30px collision box  
        width: 30,
        height: 30,
        category: 'environment'
      };
    }

    update(deltaTime: number): void {
      this.updateSpringPhysics(deltaTime);
      this.updateCollisionBox();
    }

    private updateSpringPhysics(deltaTime: number): void {
      // Hooke's law: F = -k * displacement
      const displacement = this.theta - this.targetTheta;
      const springForce = -this.springK * displacement;
      
      // Apply spring force and damping
      this.thetaVelocity += springForce * deltaTime;
      this.thetaVelocity *= this.damping;
      this.theta += this.thetaVelocity * deltaTime;
      
      // Gradually return to rest position when not actively deflecting
      if (!this.isDeflecting) {
        this.targetTheta *= 0.95;
      }
    }

    private updateCollisionBox(): void {
      if (this.collisionBox) {
        this.collisionBox.x = this.transform.x - 15;
        this.collisionBox.y = this.transform.y - 15;
      }
    }

    private drawKnob(ctx: CanvasRenderingContext2D, x: number, y: number): void {
      const centerX = x + 30; // Center of 60px canvas area
      const centerY = y + 30;
      
      // Calculate knob position using spring physics
      const knobX = centerX + Math.cos(this.theta) * this.springLength;
      const knobY = centerY + Math.sin(this.theta) * this.springLength;
      
      // Draw spring arm
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(knobX, knobY);
      ctx.stroke();
      
      // Draw pivot point
      ctx.fillStyle = '#5d4e75';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw main knob
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.arc(knobX, knobY, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw highlight
      ctx.fillStyle = '#ffab91';
      ctx.beginPath();
      ctx.arc(knobX - 2, knobY - 2, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    deflect(direction: number): void {
      this.isDeflecting = true;
      this.deflectionDirection = direction;
      
      // Set target deflection angle (30 degrees)
      this.targetTheta = direction * (Math.PI / 6);
      
      // Add impulse velocity for dynamic response
      this.thetaVelocity += direction * 2;
      
      // Stop deflecting after animation completes
      setTimeout(() => {
        this.isDeflecting = false;
      }, 200);
    }
  }
}