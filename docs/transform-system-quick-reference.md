# Quick Reference: Transform-Based Architecture

## For Developers Working on Jamble

### New Collision Configuration System

All game objects now have configurable collision shapes instead of hardcoded values.

#### Tuning Collision Difficulty

```typescript
// Make collision more forgiving (80% of visual size)
collisionConfig: {
  shape: 'circle',
  scaleX: 0.8,  // Smaller collision = easier gameplay
  scaleY: 0.8,
  offsetX: 0,
  offsetY: 0
}

// Make collision more precise (100% of visual size)
collisionConfig: {
  shape: 'rect',
  scaleX: 1.0,  // Full size collision = harder gameplay
  scaleY: 1.0,
  offsetX: 0,
  offsetY: 0
}
```

#### Current Collision Settings

| Object | Shape | Scale | Purpose |
|--------|-------|-------|---------|
| Player | Circle | 80% | Forgiving player collision |
| Trees | Rectangle | 80% × 83% | Forgiving obstacle collision |
| Knobs | Circle | 60% | Natural spring interaction |  
| Birds | Circle | 70% | Balanced flying obstacle |

### Adding New Game Objects

When creating new game objects, follow this pattern:

```typescript
class NewElement implements LevelElement, TransformLevelElement {
  private transform: ElementTransform;
  private collisionConfig: CollisionConfig;
  
  constructor() {
    // Define logical size and collision behavior
    this.transform = {
      x: 0,
      y: 0,
      width: 30,    // Logical size
      height: 40
    };
    
    this.collisionConfig = {
      shape: 'rect',      // or 'circle'
      scaleX: 0.9,        // Tune for gameplay feel
      scaleY: 0.9,
      offsetX: 0,         // Adjust collision position
      offsetY: 0
    };
  }
  
  // Required interface methods
  getTransform(): ElementTransform { return { ...this.transform }; }
  getCollisionConfig(): CollisionConfig { return { ...this.collisionConfig }; }
  syncVisualToTransform(): void { /* Update DOM from transform if needed */ }
  
  // Hybrid collision detection
  getCollisionShape(): CollisionShape {
    const rect = this.el.getBoundingClientRect();
    const centerX = rect.x + rect.width / 2 + this.collisionConfig.offsetX;
    const centerY = rect.y + rect.height / 2 + this.collisionConfig.offsetY;
    
    if (this.collisionConfig.shape === 'circle') {
      const baseRadius = Math.min(this.transform.width, this.transform.height) / 2;
      const radius = baseRadius * this.collisionConfig.scaleX;
      return CollisionManager.createCircleShape(centerX, centerY, radius, 'neutral');
    } else {
      const collisionWidth = this.transform.width * this.collisionConfig.scaleX;
      const collisionHeight = this.transform.height * this.collisionConfig.scaleY;
      const offsetX = (rect.width - collisionWidth) / 2 + this.collisionConfig.offsetX;
      const offsetY = (rect.height - collisionHeight) / 2 + this.collisionConfig.offsetY;
      
      const collisionBounds = new DOMRect(
        rect.x + offsetX, rect.y + offsetY,
        collisionWidth, collisionHeight
      );
      return CollisionManager.createRectShape(collisionBounds, 'neutral');
    }
  }
}
```

### Architecture Benefits

1. **Performance**: Collision size calculated from logical data, not DOM queries
2. **Tunable**: Easy to adjust collision difficulty without changing CSS
3. **Consistent**: Same pattern across all game objects
4. **Maintainable**: Clear separation between visual and collision logic

### Future Improvements Available  

1. **BaseTransformElement class**: Reduce code duplication (~50 lines saved)
2. **Full transform positioning**: Eliminate remaining DOM dependencies  
3. **Unified renderer**: Single system for updating all DOM from transforms

See `docs/transform-system-implementation-summary.md` for complete details.