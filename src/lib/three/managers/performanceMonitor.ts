import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryTotal?: number;
  memoryUsed?: number;
  triangles: number;
  textures: number;
  shaders: number;
  calls: number;
  geometries: number;
  meshes: number;
  lights: number;
}

/**
 * Performance Monitor options
 */
export interface PerformanceMonitorOptions {
  /** Enable the Stats.js panel (FPS, MS, MB) */
  showStatsPanel?: boolean;
  /** DOM element to append the Stats panel to */
  statsPanelContainer?: HTMLElement;
  /** Position of stats panel - 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right */
  statsPanelPosition?: 0 | 1 | 2 | 3;
  /** Enable logging performance metrics to console */
  logToConsole?: boolean;
  /** Interval (in seconds) for logging to console */
  logInterval?: number;
  /** Enable detailed WebGL renderer info */
  trackRendererStats?: boolean;
  /** Track memory usage (only works in Chrome) */
  trackMemory?: boolean;
  /** Custom callback for performance metrics */
  onMetricsUpdated?: (metrics: PerformanceMetrics) => void;
}

/**
 * Performance Monitor for tracking Three.js and WebGL performance metrics
 *
 * This class provides detailed performance monitoring for Three.js applications:
 * - FPS monitoring and frame time tracking
 * - WebGL renderer statistics (draw calls, triangles, etc.)
 * - Memory usage tracking (in Chrome)
 * - Scene object counting (meshes, lights, etc.)
 * - Optional Stats.js integration for visual display
 * - Custom metrics panel creation
 *
 * Usage:
 * ```typescript
 * // Create a monitor
 * const monitor = createPerformanceMonitor(renderer, scene, {
 *   showStatsPanel: true,
 *   logToConsole: true,
 *   logInterval: 5
 * });
 *
 * // In your animation loop
 * function animate() {
 *   requestAnimationFrame(animate);
 *   monitor.update();
 *   // ... render scene
 * }
 * ```
 */
export class PerformanceMonitor {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private options: PerformanceMonitorOptions;
  private stats: Stats | null = null;
  private lastLogTime = 0;
  private frameCount = 0;
  private totalFrameTime = 0;
  private startTime = 0;
  private lastFrameTime = 0;
  private metricsHistory: PerformanceMetrics[] = [];
  private rendererInfo: any = null;
  private enabled = true;

  /**
   * Creates a new performance monitor
   * @param renderer The Three.js WebGL renderer
   * @param scene The Three.js scene
   * @param options Configuration options
   */
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    options: PerformanceMonitorOptions = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.options = {
      showStatsPanel: options.showStatsPanel ?? true,
      statsPanelPosition: options.statsPanelPosition ?? 0,
      logToConsole: options.logToConsole ?? false,
      logInterval: options.logInterval ?? 5,
      trackRendererStats: options.trackRendererStats ?? true,
      trackMemory: options.trackMemory ?? true,
      onMetricsUpdated: options.onMetricsUpdated,
      statsPanelContainer: options.statsPanelContainer || document.body,
    };

    this.initStatsPanel();
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;

    // Get renderer info if tracking is enabled
    if (this.options.trackRendererStats) {
      this.rendererInfo = this.renderer.info;
    }
  }

  /**
   * Initializes the Stats.js panel if enabled
   */
  private initStatsPanel(): void {
    if (this.options.showStatsPanel) {
      this.stats = new Stats();
      const panel = this.stats.dom;

      // Set the position based on option
      panel.style.position = "absolute";

      switch (this.options.statsPanelPosition) {
        case 0: // top-left
          panel.style.top = "0px";
          panel.style.left = "0px";
          break;
        case 1: // top-right
          panel.style.top = "0px";
          panel.style.right = "0px";
          break;
        case 2: // bottom-left
          panel.style.bottom = "0px";
          panel.style.left = "0px";
          break;
        case 3: // bottom-right
          panel.style.bottom = "0px";
          panel.style.right = "0px";
          break;
      }

      this.options?.statsPanelContainer?.appendChild(panel);
    }
  }

  /**
   * Updates the performance monitor - call this in your animation loop
   */
  update(): void {
    if (!this.enabled) return;

    // Update Stats.js panel
    if (this.stats) {
      this.stats.update();
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.frameCount++;
    this.totalFrameTime += deltaTime;

    // Track and log metrics if needed
    if (
      this.options.logToConsole &&
      currentTime - this.lastLogTime > this.options.logInterval! * 1000
    ) {
      const metrics = this.getMetrics();
      this.logMetrics(metrics);
      this.lastLogTime = currentTime;

      // Reset counters
      this.frameCount = 0;
      this.totalFrameTime = 0;
    }

    // Call metrics callback if provided
    if (this.options.onMetricsUpdated) {
      this.options.onMetricsUpdated(this.getMetrics());
    }
  }

  /**
   * Gets the current performance metrics
   * @returns The current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const fps =
      this.frameCount > 0 ? this.frameCount / (this.totalFrameTime / 1000) : 0;

    const metrics: PerformanceMetrics = {
      fps: Math.round(fps * 10) / 10,
      frameTime:
        this.frameCount > 0 ? this.totalFrameTime / this.frameCount : 0,
      triangles: 0,
      textures: 0,
      shaders: 0,
      calls: 0,
      geometries: 0,
      meshes: 0,
      lights: 0,
    };

    // Add renderer info if available
    if (this.rendererInfo) {
      metrics.triangles = this.rendererInfo.render?.triangles || 0;
      metrics.calls = this.rendererInfo.render?.calls || 0;
      metrics.textures = this.rendererInfo.memory?.textures || 0;
      metrics.geometries = this.rendererInfo.memory?.geometries || 0;
      metrics.meshes = this.countSceneObjects().meshes;
      metrics.lights = this.countSceneObjects().lights;
      metrics.shaders = this.rendererInfo.programs?.length || 0;
    }

    // Add memory info if available and tracking is enabled
    if (this.options.trackMemory && (performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      metrics.memoryTotal = Math.round(
        memoryInfo.totalJSHeapSize / (1024 * 1024)
      );
      metrics.memoryUsed = Math.round(
        memoryInfo.usedJSHeapSize / (1024 * 1024)
      );
    }

    // Store metrics in history
    this.metricsHistory.push({ ...metrics });
    if (this.metricsHistory.length > 60) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Counts the objects in the scene by type
   * @returns Object count by type
   */
  private countSceneObjects(): { meshes: number; lights: number } {
    let meshCount = 0;
    let lightCount = 0;

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshCount++;
      } else if (object instanceof THREE.Light) {
        lightCount++;
      }
    });

    return { meshes: meshCount, lights: lightCount };
  }

  /**
   * Logs metrics to the console
   * @param metrics The metrics to log
   */
  private logMetrics(metrics: PerformanceMetrics): void {
    if (!this.options.logToConsole) return;

    console.group("Performance Metrics");
    console.log(`FPS: ${metrics.fps.toFixed(1)}`);
    console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms`);

    if (metrics.memoryUsed !== undefined) {
      console.log(`Memory: ${metrics.memoryUsed}MB / ${metrics.memoryTotal}MB`);
    }

    console.log(`Triangles: ${metrics.triangles.toLocaleString()}`);
    console.log(`Draw Calls: ${metrics.calls}`);
    console.log(`Geometries: ${metrics.geometries}`);
    console.log(`Textures: ${metrics.textures}`);
    console.log(`Meshes: ${metrics.meshes}`);
    console.log(`Lights: ${metrics.lights}`);
    console.log(`Shaders: ${metrics.shaders}`);
    console.groupEnd();
  }

  /**
   * Creates a custom DOM panel for displaying performance metrics
   * @param container DOM element to append the panel to
   */
  createCustomPanel(container: HTMLElement): void {
    const panel = document.createElement("div");
    panel.style.position = "absolute";
    panel.style.top = "10px";
    panel.style.right = "10px";
    panel.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    panel.style.color = "white";
    panel.style.padding = "10px";
    panel.style.borderRadius = "5px";
    panel.style.fontFamily = "monospace";
    panel.style.fontSize = "12px";
    panel.style.width = "200px";
    panel.style.zIndex = "1000";

    const metrics = this.getMetrics();

    // Create metrics elements
    const createMetricElement = (label: string, value: string) => {
      const el = document.createElement("div");
      el.style.marginBottom = "5px";
      el.style.display = "flex";
      el.style.justifyContent = "space-between";

      const labelEl = document.createElement("span");
      labelEl.textContent = label;

      const valueEl = document.createElement("span");
      valueEl.textContent = value;
      valueEl.id = `perf-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      el.appendChild(labelEl);
      el.appendChild(valueEl);
      return el;
    };

    panel.appendChild(createMetricElement("FPS", metrics.fps.toFixed(1)));
    panel.appendChild(
      createMetricElement("Frame Time", `${metrics.frameTime.toFixed(2)}ms`)
    );

    if (metrics.memoryUsed !== undefined) {
      panel.appendChild(
        createMetricElement("Memory", `${metrics.memoryUsed}MB`)
      );
    }

    panel.appendChild(
      createMetricElement("Triangles", metrics.triangles.toLocaleString())
    );
    panel.appendChild(
      createMetricElement("Draw Calls", metrics.calls.toString())
    );
    panel.appendChild(createMetricElement("Meshes", metrics.meshes.toString()));
    panel.appendChild(createMetricElement("Lights", metrics.lights.toString()));

    container.appendChild(panel);

    // Setup update interval
    const updatePanel = () => {
      if (!this.enabled) return;

      const metrics = this.getMetrics();

      // Update values
      (document.getElementById("perf-fps") as HTMLElement).textContent =
        metrics.fps.toFixed(1);
      (
        document.getElementById("perf-frame-time") as HTMLElement
      ).textContent = `${metrics.frameTime.toFixed(2)}ms`;

      if (metrics.memoryUsed !== undefined) {
        (
          document.getElementById("perf-memory") as HTMLElement
        ).textContent = `${metrics.memoryUsed}MB`;
      }

      (document.getElementById("perf-triangles") as HTMLElement).textContent =
        metrics.triangles.toLocaleString();
      (document.getElementById("perf-draw-calls") as HTMLElement).textContent =
        metrics.calls.toString();
      (document.getElementById("perf-meshes") as HTMLElement).textContent =
        metrics.meshes.toString();
      (document.getElementById("perf-lights") as HTMLElement).textContent =
        metrics.lights.toString();

      requestAnimationFrame(updatePanel);
    };

    requestAnimationFrame(updatePanel);
  }

  /**
   * Enables or disables the performance monitor
   * @param enabled Whether the monitor should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.stats) {
      this.stats.dom.style.display = enabled ? "block" : "none";
    }
  }

  /**
   * Disposes the performance monitor
   */
  dispose(): void {
    if (
      this.stats &&
      this.options.statsPanelContainer &&
      this.options.statsPanelContainer.contains(this.stats.dom)
    ) {
      this.options.statsPanelContainer.removeChild(this.stats.dom);
    }
    this.metricsHistory = [];
  }
}

/**
 * Creates a performance monitor with the given options
 * @param renderer The Three.js WebGL renderer
 * @param scene The Three.js scene
 * @param options Configuration options
 * @returns The performance monitor instance
 */
export const createPerformanceMonitor = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  options?: PerformanceMonitorOptions
): PerformanceMonitor => {
  return new PerformanceMonitor(renderer, scene, options);
};
