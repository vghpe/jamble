
### **Current Approach: DOM-Dependent Collision**
```
DOM Element → CSS → Rendering → getBoundingClientRect() → Collision Shape
```

**Problems:**
1. **Tight Coupling**: Collision behavior depends on visual styling
2. **Performance Cost**: `getBoundingClientRect()` calls are expensive  
3. **Unpredictable**: CSS changes affect gameplay collision
4. **DOM Dependency**: Collision calculation requires rendered elements

### **Better Approach: Transform-Based System**
```
Transform Data → Visual Rendering + Collision Shape (independent)
```


## Recommended Future Architecture

### **Transform-Based Collision System**
```typescript
interface ElementTransform {
  x: number;           // World position
  y: number;           
  width: number;       // Logical dimensions
  height: number;      
}

interface CollisionConfig {
  shape: 'rect' | 'circle';
  scaleX: number;      // Collision size vs logical size
  scaleY: number;
  offsetX: number;     // Collision offset from logical center
  offsetY: number;
  radius?: number;     // For circles
}

class LevelElement {
  private transform: ElementTransform;
  private collisionConfig: CollisionConfig;
  
  getCollisionShape(): CollisionShape {
    // Calculate from transform + config, NOT from DOM
  }
  
  syncVisualToTransform(): void {
    // Update DOM to match logical transform
  }
}
```

### **Migration Strategy**
1. **Phase 1**: Add transform layer alongside current system
2. **Phase 2**: Move collision calculations to use transforms
3. **Phase 3**: Move positioning to use transforms  
4. **Phase 4**: Remove DOM-dependent collision methods

## Current System Assessment
