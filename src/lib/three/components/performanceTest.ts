import * as THREE from "three";
import {
  cityConfig,
  performanceConfig,
  highQualityConfig,
} from "../config/cityConfig";
import { createCityEnvironment } from "../environment/cityEnvironment";
import {
  createPerformanceMonitor,
  PerformanceMonitor,
} from "../managers/performanceMonitor";
import { createPerformanceBenchmark } from "../utils/performanceBenchmark";

/**
 * Performance test component to benchmark different configurations
 */
export class PerformanceTest {
  private readonly renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private container: HTMLElement;
  public perfMonitor: PerformanceMonitor; // Make public so it can be accessed from outside
  private initialized = false;

  /**
   * Creates a new performance test component
   * @param renderer Three.js WebGL renderer
   * @param scene Three.js scene
   * @param container DOM container for UI
   */
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    container: HTMLElement
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.container = container;

    // Initialize performance monitor
    this.perfMonitor = createPerformanceMonitor(renderer, scene, {
      showStatsPanel: true,
      statsPanelContainer: container,
      statsPanelPosition: 1,
      logToConsole: false,
      trackRendererStats: true,
      trackMemory: true,
    });
  }

  /**
   * Initializes the performance test UI
   */
  init(): void {
    if (this.initialized) return;

    // Create UI container
    const uiContainer = document.createElement("div");
    uiContainer.style.position = "absolute";
    uiContainer.style.bottom = "10px";
    uiContainer.style.left = "10px";
    uiContainer.style.zIndex = "1000";

    // Create test buttons
    this.createTestButton(uiContainer, "Show Stats", () => {
      this.perfMonitor.setEnabled(true);
    });

    this.createTestButton(uiContainer, "Hide Stats", () => {
      this.perfMonitor.setEnabled(false);
    });

    this.createTestButton(uiContainer, "Run Quality Comparison", async () => {
      await this.runQualityComparison();
    });

    this.createTestButton(uiContainer, "Show Custom Panel", () => {
      this.perfMonitor.createCustomPanel(this.container);
    });

    this.container.appendChild(uiContainer);

    // Create results container
    const resultsContainer = document.createElement("div");
    resultsContainer.id = "benchmark-results";
    resultsContainer.style.position = "absolute";
    resultsContainer.style.top = "50%";
    resultsContainer.style.left = "50%";
    resultsContainer.style.transform = "translate(-50%, -50%)";
    resultsContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    resultsContainer.style.padding = "20px";
    resultsContainer.style.borderRadius = "10px";
    resultsContainer.style.maxWidth = "80%";
    resultsContainer.style.maxHeight = "80%";
    resultsContainer.style.overflowY = "auto";
    resultsContainer.style.zIndex = "2000";
    resultsContainer.style.display = "none";

    // Add close button to results
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.padding = "5px 10px";
    closeButton.addEventListener("click", () => {
      resultsContainer.style.display = "none";
    });

    resultsContainer.appendChild(closeButton);
    this.container.appendChild(resultsContainer);

    this.initialized = true;
  }

  /**
   * Creates a test button
   * @param container Container to add the button to
   * @param label Button label
   * @param onClick Click handler
   */
  private createTestButton(
    container: HTMLElement,
    label: string,
    onClick: () => void
  ): void {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.margin = "5px";
    button.style.padding = "8px 16px";
    button.style.backgroundColor = "#4CAF50";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.addEventListener("click", onClick);

    container.appendChild(button);
  }

  /**
   * Runs a comparison between different quality settings
   */
  async runQualityComparison(): Promise<void> {
    // Show loading message
    const resultsContainer = document.getElementById("benchmark-results");
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
      <h2>Running benchmark...</h2>
      <div id="benchmark-progress" style="margin: 20px 0; text-align: center;">
        <div id="benchmark-status">Initializing...</div>
        <div style="margin: 10px 0; height: 20px; width: 100%; background-color: #333; border-radius: 10px; overflow: hidden;">
          <div id="benchmark-progress-bar" style="height: 100%; width: 0%; background-color: #4CAF50; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    resultsContainer.style.display = "block";

    const statusElement = document.getElementById("benchmark-status");
    const progressBar = document.getElementById("benchmark-progress-bar");

    // Create benchmark
    const benchmark = createPerformanceBenchmark(
      () => {
        // Update the performance monitor and return the metrics
        this.perfMonitor.update();
        return this.perfMonitor.getMetrics();
      },
      {
        framesPerTest: 100,
        waitForStabilization: true,
        stabilizationTime: 1000,
        logResults: true,
        onProgress: (progress) => {
          // Update progress UI
          if (statusElement && progressBar) {
            const percent = Math.round(
              (progress.testIndex / progress.totalTests) * 100
            );
            progressBar.style.width = `${percent}%`;
            statusElement.textContent = `${progress.testName}: ${progress.status} (${progress.testIndex}/${progress.totalTests})`;
          }
        },
      }
    );

    // Add tests for different quality settings
    benchmark.addTest({
      name: "Default Quality",
      setup: async () => {
        // Create environment with default config
        const environment = createCityEnvironment(
          this.scene,
          cityConfig.environment
        );
        environment.initialize();
      },
      teardown: async () => {
        // Clear scene except for the buildings
        this.clearScene();
      },
    });

    benchmark.addTest({
      name: "Performance Mode (Low Quality)",
      setup: async () => {
        // Create environment with performance config
        const environment = createCityEnvironment(
          this.scene,
          performanceConfig.environment
        );
        environment.initialize();
      },
      teardown: async () => {
        // Clear scene except for the buildings
        this.clearScene();
      },
    });

    benchmark.addTest({
      name: "High Quality",
      setup: async () => {
        // Create environment with high quality config
        const environment = createCityEnvironment(
          this.scene,
          highQualityConfig.environment
        );
        environment.initialize();
      },
      teardown: async () => {
        // Clear scene except for the buildings
        this.clearScene();
      },
    });

    // Run benchmark
    try {
      // Run all tests
      const results = await benchmark.runAll();

      // Display results
      resultsContainer.innerHTML = benchmark.createHtmlReport();

      // Add close button
      const closeButton = document.createElement("button");
      closeButton.textContent = "Close";
      closeButton.style.position = "absolute";
      closeButton.style.top = "10px";
      closeButton.style.right = "10px";
      closeButton.style.padding = "5px 10px";
      closeButton.addEventListener("click", () => {
        resultsContainer.style.display = "none";
      });

      resultsContainer.appendChild(closeButton);

      console.log(`Benchmark completed with ${results.length} test results`);
    } catch (error) {
      console.error("Error running benchmark:", error);
      resultsContainer.innerHTML = `<h2>Benchmark Error</h2><p>${error}</p>`;
    }
  }

  /**
   * Clears scene except for buildings
   */
  private clearScene(): void {
    // Filter out objects to keep (typically buildings)
    const objectsToRemove: THREE.Object3D[] = [];

    this.scene.traverse((object) => {
      // Keep camera and buildings, remove everything else
      // You may need to adjust this logic based on your scene structure
      if (
        !(object instanceof THREE.Camera) &&
        object.userData.type !== "building" &&
        object.parent === this.scene
      ) {
        objectsToRemove.push(object);
      }
    });

    // Remove objects
    objectsToRemove.forEach((object) => {
      this.scene.remove(object);

      // Dispose resources
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }

  /**
   * Updates the performance test
   */
  update(): void {
    if (!this.initialized) return;

    // Update performance monitor
    this.perfMonitor.update();
    
    // Log renderer info occasionally (to use the renderer property)
    if (Math.random() < 0.001) {
      console.debug("Renderer info:", this.renderer.info);
    }
  }

  /**
   * Disposes resources
   */
  dispose(): void {
    this.perfMonitor.dispose();
  }
}

/**
 * Creates a performance test component
 * @param renderer Three.js WebGL renderer
 * @param scene Three.js scene
 * @param container DOM container for UI
 * @returns A performance test instance
 */
export const createPerformanceTest = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  container: HTMLElement
): PerformanceTest => {
  return new PerformanceTest(renderer, scene, container);
};
