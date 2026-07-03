export class Camera {
  /** Souřadnice světa zobrazené v levém horním rohu plátna. */
  x = 0;
  y = 0;
  zoom = 1;
  minZoom = 0.35;
  maxZoom = 2.5;

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y };
  }

  pan(dxScreen: number, dyScreen: number): void {
    this.x -= dxScreen / this.zoom;
    this.y -= dyScreen / this.zoom;
  }

  zoomAt(screenX: number, screenY: number, factor: number): void {
    const before = this.screenToWorld(screenX, screenY);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    const after = this.screenToWorld(screenX, screenY);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
  }

  /** Vycentruje kameru na daný bod světa v rámci plátna dané velikosti. */
  centerOn(wx: number, wy: number, canvasWidth: number, canvasHeight: number): void {
    this.x = wx - canvasWidth / 2 / this.zoom;
    this.y = wy - canvasHeight / 2 / this.zoom;
  }
}
