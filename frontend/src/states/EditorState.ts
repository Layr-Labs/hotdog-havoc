import Phaser from 'phaser';
import { BaseState } from './BaseState';
import { GameStateType } from './GameState';
import { GameEventEmitter, GameEventType } from './GameEvents';
import { createSkyGradient } from '../utils/gradientUtils';
import { Window } from '../components/Window';
import { InputField } from '../components/InputField';
import { LabelComponent } from '../components/LabelComponent';
import { ButtonComponent } from '../components/ButtonComponent';

interface Block {
  x: number;
  y: number;
}

export class EditorState extends BaseState {
  private backButton: Phaser.GameObjects.Image | null = null;
  private floppyButton: Phaser.GameObjects.Image | null = null;
  private window: Window | null = null;
  private bgImage: Phaser.GameObjects.Image | null = null;
  private coordText: Phaser.GameObjects.Text | null = null;
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private blocks: Set<string> = new Set(); // Using string keys like "x,y" for easy lookup
  private shouldIgnoreNextClick: boolean = true;
  private isDrawing: boolean = false;
  private blockGraphics: Phaser.GameObjects.Graphics | null = null;
  private soilTileSprite: Phaser.GameObjects.TileSprite | null = null;
  private grassTileSprite: Phaser.GameObjects.TileSprite | null = null;
  private maskRenderTexture: Phaser.GameObjects.RenderTexture | null = null;
  private grassRenderTexture: Phaser.GameObjects.RenderTexture | null = null;
  private cameraOffsetX: number = 0;
  private cameraOffsetY: number = 0;
  private readonly WORLD_WIDTH = 3200; // 200 blocks * 16px
  private readonly BLOCK_SIZE = 16;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;
  private readonly TILEMAP_HEIGHT = 100; // Adjust as needed
  private landTileIndex: number = 0;
  private worldMap: boolean[][] = [];
  private inputField: InputField | null = null;

  protected onCreate(): void {
    this.shouldIgnoreNextClick = true;
    // Set camera to bottom of world
    const maxOffsetY = Math.max(0, (this.TILEMAP_HEIGHT * this.BLOCK_SIZE) - this.scene.scale.height);
    this.cameraOffsetX = 0;
    this.cameraOffsetY = maxOffsetY;
    this.scene.cameras.main.scrollY = this.cameraOffsetY;
    this.setupBackground();
    this.drawGrid();
    this.setupBackButton();
    this.setupFloppyButton();
    this.setupCoordDisplay();
    this.setupTilemap();
    this.window = new Window(this.scene);
    this.inputField = new InputField(this.scene);
    this.scene.input.on('pointermove', this.updateCoordDisplay, this);
    this.scene.input.on('pointerdown', this.handleBlockPointerDown, this);
    this.scene.input.on('pointermove', this.handleBlockPointerMove, this);
    this.scene.input.on('pointerup', this.handleBlockPointerUp, this);
    this.scene.scale.on('resize', this.handleResize, this);
    // Mouse wheel scroll
    if (this.scene.game.canvas) {
      this.scene.game.canvas.addEventListener('wheel', this.handleWheelScroll, { passive: false });
    }

    // Set up camera bounds
    const height = this.TILEMAP_HEIGHT * this.BLOCK_SIZE;
    this.scene.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, height);
    this.scene.cameras.main.scrollX = this.cameraOffsetX;
    this.scene.cameras.main.scrollY = this.cameraOffsetY;
  }

  protected onUpdate(): void {
    // No need to update here, handled by events
  }

  protected onDestroy(): void {
    if (this.bgImage) this.bgImage.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.floppyButton) this.floppyButton.destroy();
    if (this.window) this.window.destroy();
    if (this.coordText) this.coordText.destroy();
    if (this.gridGraphics) this.gridGraphics.destroy();
    if (this.blockGraphics) this.blockGraphics.destroy();
    if (this.soilTileSprite) this.soilTileSprite.destroy();
    if (this.maskRenderTexture) this.maskRenderTexture.destroy();
    if (this.grassRenderTexture) this.grassRenderTexture.destroy();
    if (this.inputField) this.inputField.destroy();
    
    // Clean up tilemap and layer
    if (this.layer) {
      this.layer.destroy();
      this.layer = null;
    }
    if (this.tilemap) {
      this.tilemap.destroy();
      this.tilemap = null;
    }
    
    // Reset camera
    this.cameraOffsetX = 0;
    this.cameraOffsetY = 0;
    this.scene.cameras.main.scrollX = 0;
    this.scene.cameras.main.scrollY = 0;
    this.scene.cameras.main.setBounds(0, 0, this.scene.scale.width, this.scene.scale.height);
    
    // Remove event listeners
    this.scene.input.off('pointermove', this.updateCoordDisplay, this);
    this.scene.input.off('pointerdown', this.handleBlockPointerDown, this);
    this.scene.input.off('pointermove', this.handleBlockPointerMove, this);
    this.scene.input.off('pointerup', this.handleBlockPointerUp, this);
    this.scene.scale.off('resize', this.handleResize, this);
    
    // Clear world map
    this.blocks.clear();
    this.worldMap = [];
    
    // Remove mouse wheel scroll
    if (this.scene.game.canvas) {
      this.scene.game.canvas.removeEventListener('wheel', this.handleWheelScroll as EventListener);
    }
  }

  private handleBlockPointerDown(pointer: Phaser.Input.Pointer): void {
    // If window is visible, don't allow any block placement
    if (this.window && this.window.isVisible()) {
      return;
    }

    if (this.shouldIgnoreNextClick) {
      this.shouldIgnoreNextClick = false;
      return;
    }

    // Check if we clicked on the floppy button
    if (this.floppyButton && this.floppyButton.getBounds().contains(pointer.x, pointer.y)) {
      return;
    }

    this.isDrawing = true;
    const deleteMode = pointer.event.shiftKey;
    this.addBlockAtPointer(pointer, deleteMode);
  }

  private handleBlockPointerMove(pointer: Phaser.Input.Pointer): void {
    // If window is visible, don't allow any block placement
    if (this.window && this.window.isVisible()) {
      return;
    }

    if (this.isDrawing) {
      // Check if we're over the floppy button
      if (this.floppyButton && this.floppyButton.getBounds().contains(pointer.x, pointer.y)) {
        return;
      }

      const deleteMode = pointer.event.shiftKey;
      this.addBlockAtPointer(pointer, deleteMode);
    }
  }

  private handleBlockPointerUp(pointer: Phaser.Input.Pointer): void {
    this.isDrawing = false;
  }

  private getSoilTileIndex(x: number, y: number): number {
    // Soil tiles start at index 16 (after the 16 grass tiles)
    // Flip Y so world Y=0 (bottom) uses bottom row of soil tileset
    const flippedY = 15 - (y % 16);
    return 16 + (flippedY * 16 + (x % 16));
  }

  private getGrassTileIndex(x: number): number {
    // Grass tiles are the first 16 tiles (0-15)
    return x % 16;
  }

  private initializeWorldMap() {
    // 200x100 (width x height) world
    const width = this.WORLD_WIDTH / this.BLOCK_SIZE;
    this.worldMap = [];
    for (let x = 0; x < width; x++) {
      this.worldMap[x] = [];
      for (let y = 0; y < this.TILEMAP_HEIGHT; y++) {
        this.worldMap[x][y] = false;
      }
    }
  }

  // Convert screen (pixel) coordinates to world (block) coordinates
  private screenToWorldSpace(screenX: number, screenY: number): { x: number, y: number } {
    const x = Math.floor((screenX + this.cameraOffsetX) / this.BLOCK_SIZE);
    const y = this.TILEMAP_HEIGHT - 1 - Math.floor((screenY + this.cameraOffsetY - (this.layer ? this.layer.y : 0)) / this.BLOCK_SIZE);
    return { x, y };
  }

  // Convert world (block) coordinates to screen (pixel) coordinates (top-left of block)
  private worldToScreenSpace(worldX: number, worldY: number): { x: number, y: number } {
    const x = worldX * this.BLOCK_SIZE - this.cameraOffsetX;
    const y = (this.TILEMAP_HEIGHT - 1 - worldY) * this.BLOCK_SIZE - this.cameraOffsetY + (this.layer ? this.layer.y : 0);
    return { x, y };
  }

  private addBlockAtPointer(pointer: Phaser.Input.Pointer, deleteMode = false): void {
    if (!this.tilemap || !this.layer) return;
    const { x: blockX, y: worldY } = this.screenToWorldSpace(pointer.x, pointer.y);
    if (blockX < 0 || blockX >= this.worldMap.length || worldY < 0 || worldY >= this.TILEMAP_HEIGHT) return;
    if (deleteMode) {
      this.worldMap[blockX][worldY] = false;
    } else {
      this.worldMap[blockX][worldY] = true;
    }
    this.redrawWorldTiles();
  }

  private redrawWorldTiles(): void {
    if (!this.layer) return;
    this.layer.fill(-1); // Clear all tiles
    for (let x = 0; x < this.worldMap.length; x++) {
      for (let worldY = 0; worldY < this.TILEMAP_HEIGHT; worldY++) {
        if (this.worldMap[x][worldY]) {
          // Map worldY (0=bottom) to tilemapY (0=top)
          const tilemapY = this.TILEMAP_HEIGHT - 1 - worldY;
          // Place soil
          this.layer.putTileAt(this.getSoilTileIndex(x, worldY), x, tilemapY);
          // If there is no soil above, place grass
          if (worldY < this.TILEMAP_HEIGHT - 1 && !this.worldMap[x][worldY + 1]) {
            this.layer.putTileAt(this.getGrassTileIndex(x), x, tilemapY - 1);
          }
        }
      }
    }
  }

  private setupBackground(): void {
    if (this.bgImage) this.bgImage.destroy();
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.bgImage.setScrollFactor(0);
      this.bgImage.setDepth(-100);
      this.addGameObject(this.bgImage);
    }
  }

  private drawGrid(): void {
    if (this.gridGraphics) this.gridGraphics.destroy();
    const width = this.WORLD_WIDTH;
    const height = this.TILEMAP_HEIGHT * this.BLOCK_SIZE;
    const grid = this.scene.add.graphics();
    grid.setDepth(-50);
    grid.lineStyle(1, 0x9b59b6, 0.25);
    // Vertical lines for the whole world
    for (let x = 0; x <= width; x += this.BLOCK_SIZE) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
      grid.strokePath();
    }
    // Horizontal lines (bottom = worldY 0)
    for (let y = 0; y <= this.TILEMAP_HEIGHT; y++) {
      const screenY = height - y * this.BLOCK_SIZE;
      grid.beginPath();
      grid.moveTo(0, screenY);
      grid.lineTo(width, screenY);
      grid.strokePath();
    }
    this.gridGraphics = grid;
    this.addGameObject(grid);
  }

  private handleResize(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Recreate background gradient
    if (this.bgImage) {
      this.bgImage.destroy();
    }
    this.bgImage = createSkyGradient(this.scene);
    if (this.bgImage) {
      this.bgImage.setScrollFactor(0);
      this.bgImage.setDepth(-100);
      this.addGameObject(this.bgImage);
    }

    // Re-setup tilemap
    this.setupTilemap();
    // No need to anchor layer to bottom after resize; keep at y=0

    // Redraw grid first
    this.drawGrid();

    // Update button positions
    if (this.backButton) {
      this.backButton.setX(width - 32);
    }
    if (this.floppyButton) {
      this.floppyButton.setX(width - 64);
    }
  }

  private setupBackButton(): void {
    this.backButton = this.scene.add.image(this.scene.scale.width - 32, 24, 'back');
    this.backButton.setOrigin(0.5, 0.5);
    this.backButton.setScale(0.5);
    this.backButton.setScrollFactor(0);
    this.backButton.setInteractive({ useHandCursor: true });
    
    this.backButton.on('pointerover', () => {
      if (this.backButton) {
        this.scene.tweens.add({ 
          targets: this.backButton, 
          scale: 0.55, 
          duration: 120, 
          ease: 'Sine.easeOut' 
        });
      }
    });

    this.backButton.on('pointerout', () => {
      if (this.backButton) {
        this.scene.tweens.add({ 
          targets: this.backButton, 
          scale: 0.5, 
          duration: 120, 
          ease: 'Sine.easeIn' 
        });
      }
    });

    this.backButton.on('pointerdown', () => {
      if (this.backButton) {
        this.scene.tweens.add({ 
          targets: this.backButton, 
          scale: 0.45, 
          duration: 80, 
          yoyo: true, 
          ease: 'Sine.easeInOut' 
        });
      }
    });

    this.backButton.on('pointerup', () => {
      GameEventEmitter.emit({
        type: GameEventType.STATE_CHANGE,
        data: { state: GameStateType.MENU }
      });
    });

    this.addGameObject(this.backButton);
  }

  private setupFloppyButton(): void {
    this.floppyButton = this.scene.add.image(this.scene.scale.width - 64, 24, 'floppy');
    this.floppyButton.setOrigin(0.5, 0.5);
    this.floppyButton.setScale(0.5);
    this.floppyButton.setScrollFactor(0);
    this.floppyButton.setInteractive({ useHandCursor: true });
    
    this.floppyButton.on('pointerover', () => {
      if (this.floppyButton) {
        this.scene.tweens.add({ 
          targets: this.floppyButton, 
          scale: 0.55, 
          duration: 120, 
          ease: 'Sine.easeOut' 
        });
      }
    });

    this.floppyButton.on('pointerout', () => {
      if (this.floppyButton) {
        this.scene.tweens.add({ 
          targets: this.floppyButton, 
          scale: 0.5, 
          duration: 120, 
          ease: 'Sine.easeIn' 
        });
      }
    });

    this.floppyButton.on('pointerdown', () => {
      if (this.floppyButton) {
        this.scene.tweens.add({ 
          targets: this.floppyButton, 
          scale: 0.45, 
          duration: 80, 
          yoyo: true, 
          ease: 'Sine.easeInOut' 
        });
      }
      
      if (this.window) {
        if (this.window.isVisible()) {
          if (this.inputField) {
            this.inputField.destroy();
            this.inputField = null;
          }
          this.window.hide();
        } else {

          // Create and show the input field
          this.inputField = new InputField(this.scene);
          // Add label above the input field, left-aligned
          const label = new LabelComponent(this.scene, 'Level Name', 12);
          this.window.addChild(-200, -40, label);
          this.window.addChild(0, -10, this.inputField, { width: 400, fontSize: 12 });
          // Add Save button below input field, centered
          const saveButton = new ButtonComponent(this.scene, 'Save', 16, 0x27ae60, () => {});
          this.window.addChild(0,40, saveButton);
          this.window.show({
            x: this.scene.scale.width / 2,
            y: this.scene.scale.height / 2,
            width: 500,
            height: 180
          });
        }
      }
    });

    this.addGameObject(this.floppyButton);
  }

  private setupCoordDisplay(): void {
    this.coordText = this.scene.add.text(16, 16, '(0, 0)', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#fff',
      align: 'left',
      backgroundColor: 'rgba(0,0,0,0.3)'
    });
    this.coordText.setOrigin(0, 0);
    this.coordText.setDepth(20);
    this.coordText.setScrollFactor(0);
    this.addGameObject(this.coordText);
  }

  private updateCoordDisplay(pointer: Phaser.Input.Pointer): void {
    if (!this.coordText || !this.layer) return;
    const { x: blockX, y: worldY } = this.screenToWorldSpace(pointer.x, pointer.y);
    this.coordText.setText(`(${blockX}, ${worldY})`);
  }

  private setupTilemap(): void {
    // Save worldMap if it exists
    let prevWorldMap = this.worldMap;
    // Remove old tilemap/layer if any
    if (this.layer) this.layer.destroy();
    if (this.tilemap) this.tilemap.destroy();
    // Create a blank tilemap
    this.tilemap = this.scene.make.tilemap({
      tileWidth: this.BLOCK_SIZE,
      tileHeight: this.BLOCK_SIZE,
      width: this.WORLD_WIDTH / this.BLOCK_SIZE,
      height: this.TILEMAP_HEIGHT,
    });
    // Add the combined land tileset
    const landTileset = this.tilemap.addTilesetImage('land', undefined, this.BLOCK_SIZE, this.BLOCK_SIZE, 0, 0);
    if (!landTileset) return;
    // Create a blank layer with the land tileset
    this.layer = this.tilemap.createBlankLayer('layer1', [landTileset], 0, 0);
    if (this.layer) {
      this.layer.setDepth(-20);
      // Anchor the tilemap to the top of the screen
      this.layer.y = 0;
    }
    // Set tile index for land tileset
    this.landTileIndex = landTileset.firstgid;
    // Restore or initialize worldMap
    if (prevWorldMap && prevWorldMap.length) {
      this.worldMap = prevWorldMap;
    } else {
      this.initializeWorldMap();
    }
    this.redrawWorldTiles();
  }

  private handleWheelScroll = (event: WheelEvent) => {
    event.preventDefault();
    const deltaX = event.deltaX;
    const deltaY = event.deltaY;
    if (deltaX !== 0) {
      const maxOffsetX = this.WORLD_WIDTH - this.scene.scale.width;
      this.cameraOffsetX = Phaser.Math.Clamp(this.cameraOffsetX + deltaX, 0, Math.max(0, maxOffsetX));
      this.scene.cameras.main.scrollX = this.cameraOffsetX;
    }
    if (deltaY !== 0) {
      const maxOffsetY = Math.max(0, (this.TILEMAP_HEIGHT * this.BLOCK_SIZE) - this.scene.scale.height);
      // Standard: wheel up (negative deltaY) scrolls up, wheel down (positive deltaY) scrolls down
      this.cameraOffsetY = Phaser.Math.Clamp(this.cameraOffsetY + deltaY, 0, maxOffsetY);
      this.scene.cameras.main.scrollY = this.cameraOffsetY;
    }
  }

  private updateTileSpriteOffsets(): void {
    if (this.soilTileSprite) {
      this.soilTileSprite.tilePositionY = -this.scene.scale.height % 256;
    }
  }
}