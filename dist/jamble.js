"use strict";
var Jamble;
(function (Jamble) {
    class GameObject {
        constructor(id, x = 0, y = 0, width = 20, height = 20) {
            this.id = id;
            this.transform = { x, y, width, height };
            this.render = {
                type: 'css-shape',
                visible: true,
                animation: { scaleX: 1, scaleY: 1 }
            };
        }
        getBounds() {
            return {
                left: this.transform.x,
                right: this.transform.x + this.transform.width,
                top: this.transform.y,
                bottom: this.transform.y + this.transform.height
            };
        }
        setPosition(x, y) {
            this.transform.x = x;
            this.transform.y = y;
        }
    }
    Jamble.GameObject = GameObject;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class SlotManager {
        constructor(gameWidth, gameHeight) {
            this.slots = [];
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.generateSlots();
        }
        generateSlots() {
            const layers = [
                { type: 'ground', yPercent: 0, columns: 6 },
                { type: 'air_low', yPercent: 25, columns: 6 },
                { type: 'air_mid', yPercent: 50, columns: 6 },
                { type: 'air_high', yPercent: 75, columns: 6 },
                { type: 'ceiling', yPercent: 100, columns: 6 }
            ];
            layers.forEach(layer => {
                for (let col = 0; col < layer.columns; col++) {
                    const x = (col + 0.5) * (this.gameWidth / layer.columns);
                    const y = (layer.yPercent / 100) * this.gameHeight;
                    this.slots.push({
                        id: `${layer.type}-${col}`,
                        type: layer.type,
                        x: x,
                        y: y,
                        occupied: false
                    });
                }
            });
        }
        getAllSlots() {
            return [...this.slots];
        }
        getSlotsByType(type) {
            return this.slots.filter(slot => slot.type === type);
        }
        getAvailableSlots(type) {
            const filteredSlots = type ? this.getSlotsByType(type) : this.slots;
            return filteredSlots.filter(slot => !slot.occupied);
        }
        occupySlot(slotId, gameObjectId) {
            const slot = this.slots.find(s => s.id === slotId);
            if (!slot || slot.occupied)
                return false;
            slot.occupied = true;
            slot.gameObjectId = gameObjectId;
            return true;
        }
        freeSlot(slotId) {
            const slot = this.slots.find(s => s.id === slotId);
            if (!slot)
                return false;
            slot.occupied = false;
            slot.gameObjectId = undefined;
            return true;
        }
    }
    Jamble.SlotManager = SlotManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Player extends Jamble.GameObject {
        constructor(x = 0, y = 0) {
            super('player', x, y, 20, 20);
            this.velocityX = 0;
            this.velocityY = 0;
            this.grounded = false;
            this.moveSpeed = 200;
            this.jumpHeight = 300;
            this.render = {
                type: 'css-shape',
                visible: true,
                cssShape: {
                    backgroundColor: '#4db6ac',
                    borderRadius: '4px'
                },
                animation: {
                    scaleX: 1,
                    scaleY: 1
                }
            };
            this.collisionBox = {
                x: 0,
                y: 0,
                width: 20,
                height: 20,
                category: 'player'
            };
        }
        update(deltaTime) {
            if (!this.grounded) {
                this.velocityY += 800 * deltaTime;
            }
            this.transform.x += this.velocityX * deltaTime;
            this.transform.y += this.velocityY * deltaTime;
            if (this.collisionBox) {
                this.collisionBox.x = this.transform.x;
                this.collisionBox.y = this.transform.y;
            }
            if (this.transform.y + this.transform.height >= 100) {
                const wasInAir = !this.grounded;
                this.transform.y = 100 - this.transform.height;
                this.velocityY = 0;
                this.grounded = true;
                if (wasInAir) {
                    this.onLanding();
                }
            }
            else {
                this.grounded = false;
            }
            if (this.transform.x < 0) {
                this.transform.x = 0;
                this.velocityX = 0;
            }
        }
        moveLeft() {
            this.velocityX = -this.moveSpeed;
        }
        moveRight() {
            this.velocityX = this.moveSpeed;
        }
        stopMoving() {
            this.velocityX = 0;
        }
        jump() {
            if (this.grounded) {
                this.velocityY = -this.jumpHeight;
                this.grounded = false;
            }
        }
        onLanding() {
            if (this.render.animation) {
                this.render.animation.scaleX = 1.4;
                this.render.animation.scaleY = 0.6;
                this.render.animation.transition = 'none';
                setTimeout(() => {
                    if (this.render.animation) {
                        this.render.animation.scaleX = 1;
                        this.render.animation.scaleY = 1;
                        this.render.animation.transition = 'transform 150ms ease-out';
                    }
                }, 50);
            }
        }
    }
    Jamble.Player = Player;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Tree extends Jamble.GameObject {
        constructor(id, x = 0, y = 0) {
            super(id, x, y, 10, 30);
            this.render = {
                type: 'element',
                visible: true,
                element: this.createTreeElement()
            };
            this.collisionBox = {
                x: x,
                y: y,
                width: 8,
                height: 25,
                category: 'environment'
            };
        }
        createTreeElement() {
            const treeEl = document.createElement('div');
            treeEl.style.cssText = `
        position: absolute;
        bottom: 0;
        width: 10px;
        height: 30px;
        background: #8d6e63;
        border-radius: 2px;
      `;
            const foliage = document.createElement('div');
            foliage.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: -5px;
        width: 20px;
        height: 20px;
        background: #66bb6a;
        border-radius: 50%;
      `;
            treeEl.appendChild(foliage);
            return treeEl;
        }
        update(deltaTime) {
            if (this.collisionBox) {
                this.collisionBox.x = this.transform.x;
                this.collisionBox.y = this.transform.y;
            }
        }
    }
    Jamble.Tree = Tree;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class MoveSkill {
        constructor() {
            this.id = 'move';
            this.name = 'Move';
        }
        execute(player) {
        }
    }
    Jamble.MoveSkill = MoveSkill;
    class JumpSkill {
        constructor() {
            this.id = 'jump';
            this.name = 'Jump';
        }
        execute(player) {
            player.jump();
        }
    }
    Jamble.JumpSkill = JumpSkill;
    class SkillManager {
        constructor() {
            this.equippedSkills = new Map();
            this.equipSkill(new MoveSkill());
            this.equipSkill(new JumpSkill());
        }
        equipSkill(skill) {
            this.equippedSkills.set(skill.id, skill);
        }
        hasSkill(id) {
            return this.equippedSkills.has(id);
        }
        useSkill(id, player) {
            const skill = this.equippedSkills.get(id);
            if (skill) {
                skill.execute(player);
            }
        }
        getEquippedSkills() {
            return Array.from(this.equippedSkills.values());
        }
    }
    Jamble.SkillManager = SkillManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Renderer {
        constructor(gameElement) {
            this.objectElements = new Map();
            this.gameElement = gameElement;
        }
        render(gameObjects) {
            const currentIds = new Set(gameObjects.map(obj => obj.id));
            for (const [id, element] of this.objectElements) {
                if (!currentIds.has(id)) {
                    element.remove();
                    this.objectElements.delete(id);
                }
            }
            gameObjects.forEach(obj => {
                if (!obj.render.visible)
                    return;
                let element = this.objectElements.get(obj.id);
                if (!element) {
                    element = document.createElement('div');
                    element.style.position = 'absolute';
                    element.style.fontSize = '16px';
                    element.style.userSelect = 'none';
                    element.style.pointerEvents = 'none';
                    this.gameElement.appendChild(element);
                    this.objectElements.set(obj.id, element);
                }
                element.style.left = obj.transform.x + 'px';
                element.style.bottom = (100 - obj.transform.y - obj.transform.height) + 'px';
                element.style.width = obj.transform.width + 'px';
                element.style.height = obj.transform.height + 'px';
                if (obj.render.type === 'css-shape' && obj.render.cssShape) {
                    element.textContent = '';
                    element.innerHTML = '';
                    element.style.backgroundColor = obj.render.cssShape.backgroundColor;
                    element.style.borderRadius = obj.render.cssShape.borderRadius || '0';
                    element.style.border = obj.render.cssShape.border || 'none';
                    element.style.boxShadow = obj.render.cssShape.boxShadow || 'none';
                }
                else if (obj.render.type === 'emoji' && obj.render.emoji) {
                    element.textContent = obj.render.emoji;
                    element.innerHTML = '';
                    element.style.backgroundColor = 'transparent';
                }
                else if (obj.render.type === 'element' && obj.render.element) {
                    element.textContent = '';
                    element.innerHTML = '';
                    element.style.backgroundColor = 'transparent';
                    element.appendChild(obj.render.element.cloneNode(true));
                }
                if (obj.render.animation) {
                    const scaleTransform = `scaleX(${obj.render.animation.scaleX}) scaleY(${obj.render.animation.scaleY})`;
                    element.style.transform = scaleTransform;
                    element.style.transition = obj.render.animation.transition || '';
                    element.style.transformOrigin = 'center bottom';
                }
            });
        }
        clear() {
            for (const element of this.objectElements.values()) {
                element.remove();
            }
            this.objectElements.clear();
        }
    }
    Jamble.Renderer = Renderer;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class CollisionRenderer {
        constructor(gameElement) {
            this.CATEGORY_COLORS = {
                player: '#7F00FF',
                deadly: '#ef4444',
                neutral: '#ffcc02',
                environment: '#60a5fa'
            };
            this.gameElement = gameElement;
            this.canvas = document.createElement('canvas');
            this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      `;
            const ctx = this.canvas.getContext('2d');
            if (!ctx)
                throw new Error('CollisionRenderer: 2D context unavailable');
            this.ctx = ctx;
            gameElement.appendChild(this.canvas);
            setTimeout(() => this.resize(), 10);
            window.addEventListener('resize', () => this.resize());
        }
        resize() {
            const rect = this.gameElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const width = Math.max(1, rect.width || this.gameElement.offsetWidth || 500);
            const height = Math.max(1, rect.height || this.gameElement.offsetHeight || 100);
            console.log(`Canvas resize: ${width}x${height} (DPR: ${dpr})`);
            this.canvas.width = width * dpr;
            this.canvas.height = height * dpr;
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
        }
        render(gameObjects, visible) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (!visible)
                return;
            gameObjects.forEach(obj => {
                if (obj.collisionBox && obj.render.visible) {
                    this.drawCollisionBox(obj.collisionBox);
                }
            });
        }
        drawCollisionBox(box) {
            const color = this.CATEGORY_COLORS[box.category];
            this.ctx.fillStyle = color + '30';
            this.ctx.fillRect(box.x, box.y, box.width, box.height);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(box.x, box.y, box.width, box.height);
            this.ctx.fillStyle = color;
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(box.category.toUpperCase(), box.x + box.width / 2, box.y - 5);
        }
        setVisible(visible) {
            this.canvas.style.display = visible ? 'block' : 'none';
        }
    }
    Jamble.CollisionRenderer = CollisionRenderer;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class StateManager {
        constructor() {
            this.currentState = 'idle';
            this.stateStartTime = 0;
            this.countdownDuration = 3000;
            this.stateStartTime = Date.now();
            console.log('🎮 StateManager initialized in IDLE state');
        }
        getCurrentState() {
            return this.currentState;
        }
        getStateTime() {
            return Date.now() - this.stateStartTime;
        }
        getCountdownTimeRemaining() {
            if (this.currentState !== 'countdown')
                return 0;
            return Math.max(0, this.countdownDuration - this.getStateTime());
        }
        getCountdownSeconds() {
            return Math.ceil(this.getCountdownTimeRemaining() / 1000);
        }
        isIdle() {
            return this.currentState === 'idle';
        }
        isCountdown() {
            return this.currentState === 'countdown';
        }
        isRunning() {
            return this.currentState === 'run';
        }
        startCountdown() {
            if (this.currentState === 'idle') {
                this.setState('countdown');
                return true;
            }
            return false;
        }
        startRun() {
            if (this.currentState === 'countdown') {
                this.setState('run');
                return true;
            }
            return false;
        }
        returnToIdle() {
            this.setState('idle');
        }
        setState(newState) {
            if (this.currentState === newState)
                return;
            const oldState = this.currentState;
            this.currentState = newState;
            this.stateStartTime = Date.now();
            console.log(`State: ${oldState} → ${newState}`);
        }
    }
    Jamble.StateManager = StateManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class DebugSystem {
        constructor(container) {
            this.debugContainer = null;
            this.showColliders = false;
            this.player = null;
            if (container) {
                this.debugContainer = container;
                this.setupSidePanelDebug();
            }
            else {
                this.setupOverlayDebug();
            }
        }
        setupSidePanelDebug() {
            if (!this.debugContainer) {
                console.error('Debug container not found');
                return;
            }
            try {
                this.debugContainer.innerHTML = `
          <div class="debug-container">
            <div class="debug-header">
              <h2>🎮 Jamble Debug</h2>
              <p class="debug-info">Rebuilt Architecture</p>
              <p class="build-info">Build: ${DebugSystem.BUILD_VERSION}</p>
            </div>
            
            <div class="debug-section">
              <div class="section-header">Player Stats</div>
              <div class="section-content">
                <div class="form-grid" id="player-stats">
                  <!-- Player stats will be populated here -->
                </div>
              </div>
            </div>
            
            <div class="debug-section">
              <div class="section-header">Debug Controls</div>
              <div class="section-content">
                <label class="debug-checkbox-label">
                  <input type="checkbox" id="toggle-colliders" class="debug-checkbox">
                  <span class="checkmark"></span>
                  Show Colliders
                </label>
              </div>
            </div>
          </div>
        `;
                console.log('Debug panel HTML created successfully');
            }
            catch (error) {
                console.error('Error setting up debug panel HTML:', error);
                return;
            }
            try {
                const style = document.createElement('style');
                style.textContent = `
          .debug-container {
            padding: 16px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            background-color: #f8f9fa;
            height: 100%;
            overflow-y: auto;
          }
          
          .debug-header {
            background: #fff;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
            margin-bottom: 12px;
          }
          
          .debug-header h2 {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: #212529;
          }
          
          .debug-info {
            margin: 0;
            font-size: 12px;
            color: #6c757d;
          }
          
          .build-info {
            margin: 4px 0 0 0;
            font-size: 10px;
            font-family: monospace;
            color: #28a745;
          }
          
          .debug-section {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 12px;
          }
          
          .section-header {
            background: #f8f9fa;
            padding: 12px 16px;
            font-weight: 600;
            border-bottom: 1px solid #dee2e6;
            color: #212529;
          }
          
          .section-content {
            padding: 16px;
          }
          
          .form-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px 16px;
            align-items: center;
          }
          
          .stat-label {
            color: #495057;
            font-weight: 500;
          }
          
          .stat-value {
            font-family: monospace;
            color: #212529;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid #dee2e6;
          }
          
          .debug-checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 14px;
            color: #212529;
          }
          
          .debug-checkbox {
            margin-right: 8px;
            cursor: pointer;
          }
          
          .debug-checkbox:checked + .checkmark {
            color: #007bff;
          }
        `;
                document.head.appendChild(style);
                console.log('Debug panel styles added successfully');
                const toggleCheckbox = this.debugContainer.querySelector('#toggle-colliders');
                if (toggleCheckbox) {
                    toggleCheckbox.onchange = () => {
                        this.showColliders = toggleCheckbox.checked;
                        console.log('Colliders visibility changed to:', this.showColliders);
                    };
                    console.log('Toggle checkbox event attached successfully');
                }
                else {
                    console.error('Could not find toggle-colliders checkbox');
                }
            }
            catch (error) {
                console.error('Error setting up debug panel styles and events:', error);
            }
        }
        setupOverlayDebug() {
            const debugElement = document.createElement('div');
            debugElement.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        border-radius: 4px;
        z-index: 1000;
      `;
            debugElement.innerHTML = `
        <div id="overlay-info"></div>
        <button id="overlay-toggle" style="margin-top: 5px; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; border-radius: 2px; cursor: pointer;">
          Toggle Colliders
        </button>
      `;
            document.body.appendChild(debugElement);
            const toggleButton = debugElement.querySelector('#overlay-toggle');
            if (toggleButton) {
                toggleButton.onclick = () => {
                    this.showColliders = !this.showColliders;
                    console.log('Debug: Toggled colliders to:', this.showColliders ? 'ON' : 'OFF');
                };
            }
        }
        setPlayer(player) {
            this.player = player;
        }
        update() {
            if (!this.player)
                return;
            if (this.debugContainer) {
                this.updateSidePanelDebug();
            }
            else {
                this.updateOverlayDebug();
            }
        }
        updateSidePanelDebug() {
            if (!this.player || !this.debugContainer)
                return;
            const statsContainer = this.debugContainer.querySelector('#player-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
          <span class="stat-label">Move Speed:</span>
          <span class="stat-value">${this.player.moveSpeed}</span>
          
          <span class="stat-label">Jump Height:</span>
          <span class="stat-value">${this.player.jumpHeight}</span>
          
          <span class="stat-label">Position X:</span>
          <span class="stat-value">${this.player.transform.x.toFixed(1)}</span>
          
          <span class="stat-label">Position Y:</span>
          <span class="stat-value">${this.player.transform.y.toFixed(1)}</span>
          
          <span class="stat-label">Velocity X:</span>
          <span class="stat-value">${this.player.velocityX.toFixed(1)}</span>
          
          <span class="stat-label">Velocity Y:</span>
          <span class="stat-value">${this.player.velocityY.toFixed(1)}</span>
          
          <span class="stat-label">Grounded:</span>
          <span class="stat-value">${this.player.grounded ? 'YES' : 'NO'}</span>
        `;
            }
            const colliderStatus = this.debugContainer.querySelector('#collider-status');
            if (colliderStatus) {
                colliderStatus.textContent = this.showColliders ? 'ON' : 'OFF';
            }
        }
        updateOverlayDebug() {
            if (!this.player)
                return;
            const infoElement = document.querySelector('#overlay-info');
            if (infoElement) {
                const info = [
                    `Move Speed: ${this.player.moveSpeed}`,
                    `Jump Height: ${this.player.jumpHeight}`,
                    `Position: ${this.player.transform.x.toFixed(1)}, ${this.player.transform.y.toFixed(1)}`,
                    `Velocity: ${this.player.velocityX.toFixed(1)}, ${this.player.velocityY.toFixed(1)}`,
                    `Grounded: ${this.player.grounded}`,
                    `Colliders: ${this.showColliders ? 'ON' : 'OFF'}`
                ].join('<br>');
                infoElement.innerHTML = info;
            }
        }
        getShowColliders() {
            return this.showColliders;
        }
    }
    DebugSystem.BUILD_VERSION = "v2.0.003";
    Jamble.DebugSystem = DebugSystem;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class InputManager {
        constructor() {
            this.keys = new Set();
            this.keyDownHandlers = new Map();
            this.keyUpHandlers = new Map();
            this.setupEventListeners();
            console.log('🎹 InputManager initialized');
        }
        setupEventListeners() {
            document.addEventListener('keydown', (e) => {
                this.keys.add(e.code);
                const handler = this.keyDownHandlers.get(e.code);
                if (handler) {
                    handler();
                    e.preventDefault();
                }
            });
            document.addEventListener('keyup', (e) => {
                this.keys.delete(e.code);
                const handler = this.keyUpHandlers.get(e.code);
                if (handler) {
                    handler();
                }
            });
        }
        isKeyPressed(keyCode) {
            return this.keys.has(keyCode);
        }
        onKeyDown(keyCode, handler) {
            this.keyDownHandlers.set(keyCode, handler);
        }
        onKeyUp(keyCode, handler) {
            this.keyUpHandlers.set(keyCode, handler);
        }
        removeKeyHandler(keyCode) {
            this.keyDownHandlers.delete(keyCode);
            this.keyUpHandlers.delete(keyCode);
        }
        isMovingLeft() {
            return this.isKeyPressed('ArrowLeft') || this.isKeyPressed('KeyA');
        }
        isMovingRight() {
            return this.isKeyPressed('ArrowRight') || this.isKeyPressed('KeyD');
        }
        isJumping() {
            return this.isKeyPressed('Space');
        }
        destroy() {
            this.keyDownHandlers.clear();
            this.keyUpHandlers.clear();
            this.keys.clear();
        }
    }
    Jamble.InputManager = InputManager;
})(Jamble || (Jamble = {}));
var Jamble;
(function (Jamble) {
    class Game {
        constructor(gameElement, debugContainer) {
            this.gameObjects = [];
            this.lastTime = 0;
            this.gameWidth = 500;
            this.gameHeight = 100;
            try {
                console.log('Initializing game...');
                this.gameElement = gameElement;
                this.renderer = new Jamble.Renderer(gameElement);
                this.collisionRenderer = new Jamble.CollisionRenderer(gameElement);
                this.stateManager = new Jamble.StateManager();
                this.inputManager = new Jamble.InputManager();
                this.slotManager = new Jamble.SlotManager(this.gameWidth, this.gameHeight);
                this.skillManager = new Jamble.SkillManager();
                console.log('Creating debug system with container:', debugContainer);
                this.debugSystem = new Jamble.DebugSystem(debugContainer);
                this.setupGameElement();
                this.createPlayer();
                this.createSampleTree();
                this.setupInput();
                this.debugSystem.setPlayer(this.player);
                console.log('Game initialization complete');
            }
            catch (error) {
                console.error('Error during game initialization:', error);
                throw error;
            }
        }
        setupGameElement() {
            this.gameElement.style.cssText = `
        position: relative;
        width: ${this.gameWidth}px;
        height: ${this.gameHeight}px;
        background: #e8f5e9;
        border: 2px solid #81c784;
        border-radius: 6px;
        overflow: hidden;
        margin: 0 auto;
      `;
        }
        createPlayer() {
            this.player = new Jamble.Player(50, 0);
            this.gameObjects.push(this.player);
        }
        createSampleTree() {
            const groundSlots = this.slotManager.getAvailableSlots('ground');
            console.log('Available ground slots:', groundSlots);
            if (groundSlots.length > 0) {
                const slot = groundSlots[2];
                console.log('Using slot:', slot);
                const tree = new Jamble.Tree('tree1', slot.x - 15, slot.y);
                console.log('Created tree at position:', tree.transform.x, tree.transform.y);
                console.log('Tree render info:', tree.render);
                this.gameObjects.push(tree);
                this.slotManager.occupySlot(slot.id, tree.id);
            }
            else {
                console.warn('No ground slots available for tree');
            }
        }
        setupInput() {
            this.inputManager.onKeyDown('Space', () => {
                if (this.skillManager.hasSkill('jump')) {
                    this.skillManager.useSkill('jump', this.player);
                }
            });
        }
        handleInput() {
            if (!this.skillManager.hasSkill('move'))
                return;
            if (this.inputManager.isMovingLeft()) {
                this.player.moveLeft();
            }
            else if (this.inputManager.isMovingRight()) {
                this.player.moveRight();
            }
            else {
                this.player.stopMoving();
            }
        }
        update(deltaTime) {
            this.handleInput();
            this.gameObjects.forEach(obj => obj.update(deltaTime));
            if (this.player.transform.x > this.gameWidth - this.player.transform.width) {
                this.player.transform.x = this.gameWidth - this.player.transform.width;
                this.player.velocityX = 0;
            }
            this.debugSystem.update();
        }
        render() {
            this.renderer.render(this.gameObjects);
            this.collisionRenderer.render(this.gameObjects, this.debugSystem.getShowColliders());
        }
        start() {
            const gameLoop = (currentTime) => {
                const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
                this.lastTime = currentTime;
                this.update(deltaTime);
                this.render();
                requestAnimationFrame(gameLoop);
            };
            requestAnimationFrame(gameLoop);
        }
    }
    Jamble.Game = Game;
})(Jamble || (Jamble = {}));
