import { PerformanceMetrics } from "../managers/performanceMonitor";

/**
 * Benchmark options
 */
export interface BenchmarkOptions {
  /** Number of frames to collect metrics for each test */
  framesPerTest: number;
  /** Whether to wait for the scene to stabilize before collecting metrics */
  waitForStabilization: boolean;
  /** Time in milliseconds to wait for stabilization */
  stabilizationTime: number;
  /** Whether to log results to console */
  logResults: boolean;
  /** Progress callback to report benchmark progress */
  onProgress?: (progress: { testName: string, testIndex: number, totalTests: number, status: string }) => void;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  name: string;
  metrics: PerformanceMetrics[];
  averages: PerformanceMetrics;
}

/**
 * Performance test configuration
 */
export interface PerformanceTest {
  name: string;
  setup: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
}

/**
 * Performance benchmark for comparing different scene configurations
 * 
 * This utility enables structured performance testing of Three.js scenes:
 * - Run multiple scene configurations as separate tests
 * - Collect detailed metrics for each test
 * - Wait for scenes to stabilize before measurement
 * - Collect metrics over multiple frames for accuracy
 * - Generate comparison reports between configurations
 * - Output results as tables or HTML reports
 * 
 * Usage:
 * ```typescript
 * // Create a benchmark
 * const benchmark = createPerformanceBenchmark(
 *   (metrics) => perfMonitor.getMetrics(),
 *   { framesPerTest: 100, waitForStabilization: true }
 * );
 * 
 * // Add tests
 * benchmark.addTest({
 *   name: "Low Quality",
 *   setup: async () => {
 *     // Set up low quality scene
 *   },
 *   teardown: async () => {
 *     // Clean up
 *   }
 * });
 * 
 * benchmark.addTest({
 *   name: "High Quality",
 *   setup: async () => {
 *     // Set up high quality scene
 *   }
 * });
 * 
 * // Run tests and get results
 * const results = await benchmark.runAll();
 * 
 * // Generate HTML report
 * const reportHtml = benchmark.createHtmlReport();
 * ```
 */
export class PerformanceBenchmark {
  private options: BenchmarkOptions;
  private metricsCallback: (metrics?: PerformanceMetrics) => PerformanceMetrics;
  private currentTest: string | null = null;
  private currentMetrics: PerformanceMetrics[] = [];
  private frameCount = 0;
  private tests: PerformanceTest[] = [];
  private results: BenchmarkResult[] = [];
  private isRunning = false;
  private startTime = 0;
  private stabilizing = false;

  /**
   * Creates a new performance benchmark
   * @param metricsCallback Callback for collecting metrics
   * @param options Benchmark options
   */
  constructor(
    metricsCallback: (metrics?: PerformanceMetrics) => PerformanceMetrics,
    options: Partial<BenchmarkOptions> = {}
  ) {
    this.metricsCallback = metricsCallback;
    this.options = {
      framesPerTest: options.framesPerTest ?? 100,
      waitForStabilization: options.waitForStabilization ?? true,
      stabilizationTime: options.stabilizationTime ?? 2000,
      logResults: options.logResults ?? true,
      onProgress: options.onProgress,
    };
  }

  /**
   * Adds a test to the benchmark
   * @param test The test configuration
   */
  addTest(test: PerformanceTest): void {
    this.tests.push(test);
  }

  /**
   * Runs all registered performance tests
   * @returns Promise that resolves when all tests are complete
   */
  async runAll(): Promise<BenchmarkResult[]> {
    if (this.isRunning) {
      console.warn("Benchmark is already running");
      return this.results;
    }

    this.isRunning = true;
    this.results = [];
    
    const totalTests = this.tests.length;

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i];
      
      // Report progress
      if (this.options.onProgress) {
        this.options.onProgress({
          testName: test.name,
          testIndex: i,
          totalTests,
          status: 'starting'
        });
      }
      
      await this.runTest(test, i, totalTests);
    }

    if (this.options.logResults) {
      this.logResults();
    }
    
    // Report completion
    if (this.options.onProgress) {
      this.options.onProgress({
        testName: 'All tests',
        testIndex: totalTests,
        totalTests,
        status: 'completed'
      });
    }

    this.isRunning = false;
    return this.results;
  }

  /**
   * Runs a specific performance test
   * @param test The test configuration
   * @param testIndex Index of the current test
   * @param totalTests Total number of tests
   */
  private async runTest(test: PerformanceTest, testIndex: number, totalTests: number): Promise<void> {
    console.log(`Running test: ${test.name}`);
    this.currentTest = test.name;
    this.currentMetrics = [];
    this.frameCount = 0;

    // Report setup
    if (this.options.onProgress) {
      this.options.onProgress({
        testName: test.name,
        testIndex,
        totalTests,
        status: 'setup'
      });
    }

    // Run test setup
    await test.setup();

    // Wait for stabilization if enabled
    if (this.options.waitForStabilization) {
      // Report stabilizing
      if (this.options.onProgress) {
        this.options.onProgress({
          testName: test.name,
          testIndex,
          totalTests,
          status: 'stabilizing'
        });
      }
      
      this.stabilizing = true;
      this.startTime = performance.now();
      
      // Wait until stabilization time passes
      await new Promise<void>((resolve) => {
        const checkStabilization = () => {
          if (performance.now() - this.startTime >= this.options.stabilizationTime) {
            this.stabilizing = false;
            resolve();
          } else {
            requestAnimationFrame(checkStabilization);
          }
        };
        
        requestAnimationFrame(checkStabilization);
      });
    }

    // Report collecting metrics
    if (this.options.onProgress) {
      this.options.onProgress({
        testName: test.name,
        testIndex,
        totalTests,
        status: 'collecting'
      });
    }

    // Collect metrics for the specified number of frames
    await new Promise<void>((resolve) => {
      const collectFrame = () => {
        if (this.frameCount >= this.options.framesPerTest) {
          resolve();
          return;
        }
        
        // Get current metrics from callback
        const metrics = this.metricsCallback();
        this.recordMetrics(metrics);
        
        // Update progress every 10 frames
        if (this.frameCount % 10 === 0 && this.options.onProgress) {
          this.options.onProgress({
            testName: test.name,
            testIndex,
            totalTests,
            status: `collecting (${this.frameCount}/${this.options.framesPerTest})`
          });
        }
        
        requestAnimationFrame(collectFrame);
      };

      collectFrame();
    });

    // Report teardown
    if (this.options.onProgress) {
      this.options.onProgress({
        testName: test.name,
        testIndex,
        totalTests,
        status: 'teardown'
      });
    }

    // Run test teardown if provided
    if (test.teardown) {
      await test.teardown();
    }

    // Calculate averages and store results
    const averages = this.calculateAverages(this.currentMetrics);
    
    this.results.push({
      name: test.name,
      metrics: [...this.currentMetrics],
      averages,
    });

    // Report completion
    if (this.options.onProgress) {
      this.options.onProgress({
        testName: test.name,
        testIndex,
        totalTests,
        status: 'completed'
      });
    }

    this.currentTest = null;
  }

  /**
   * Records a metric for the current test
   * @param metrics The metrics to record
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    if (!this.isRunning || this.currentTest === null || this.stabilizing) {
      return;
    }

    this.currentMetrics.push({ ...metrics });
    this.frameCount++;
  }

  /**
   * Calculates average metrics from a collection of metrics
   * @param metrics The metrics to average
   * @returns The average metrics
   */
  private calculateAverages(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) {
      return {
        fps: 0,
        frameTime: 0,
        triangles: 0,
        textures: 0,
        shaders: 0,
        calls: 0,
        geometries: 0,
        meshes: 0,
        lights: 0,
      };
    }

    const sum = metrics.reduce(
      (acc, curr) => {
        return {
          fps: acc.fps + curr.fps,
          frameTime: acc.frameTime + curr.frameTime,
          triangles: acc.triangles + curr.triangles,
          textures: acc.textures + curr.textures,
          shaders: acc.shaders + curr.shaders,
          calls: acc.calls + curr.calls,
          geometries: acc.geometries + curr.geometries,
          meshes: acc.meshes + curr.meshes,
          lights: acc.lights + curr.lights,
          memoryUsed: (acc.memoryUsed ?? 0) + (curr.memoryUsed ?? 0),
          memoryTotal: (acc.memoryTotal ?? 0) + (curr.memoryTotal ?? 0),
        };
      },
      {
        fps: 0,
        frameTime: 0,
        triangles: 0,
        textures: 0,
        shaders: 0,
        calls: 0,
        geometries: 0,
        meshes: 0,
        lights: 0,
        memoryUsed: 0,
        memoryTotal: 0,
      }
    );

    const count = metrics.length;
    const hasMemory = metrics.some((m) => m.memoryUsed !== undefined);

    const result: PerformanceMetrics = {
      fps: sum.fps / count,
      frameTime: sum.frameTime / count,
      triangles: Math.round(sum.triangles / count),
      textures: Math.round(sum.textures / count),
      shaders: Math.round(sum.shaders / count),
      calls: Math.round(sum.calls / count),
      geometries: Math.round(sum.geometries / count),
      meshes: Math.round(sum.meshes / count),
      lights: Math.round(sum.lights / count),
    };

    if (hasMemory) {
      result.memoryUsed = Math.round(sum.memoryUsed! / count);
      result.memoryTotal = Math.round(sum.memoryTotal! / count);
    }

    return result;
  }

  /**
   * Logs benchmark results to the console
   */
  logResults(): void {
    console.group("Performance Benchmark Results");

    const table: any[] = [];
    this.results.forEach((result) => {
      const { averages } = result;
      
      table.push({
        "Test": result.name,
        "FPS": averages.fps.toFixed(1),
        "Frame Time (ms)": averages.frameTime.toFixed(2),
        "Memory (MB)": averages.memoryUsed ?? "N/A",
        "Triangles": averages.triangles.toLocaleString(),
        "Draw Calls": averages.calls,
        "Meshes": averages.meshes,
        "Lights": averages.lights,
      });
    });

    console.table(table);
    
    // Calculate performance differences between first and other tests
    if (this.results.length > 1) {
      console.group("Performance Comparison (relative to first test)");
      
      const baseline = this.results[0].averages;
      
      for (let i = 1; i < this.results.length; i++) {
        const current = this.results[i].averages;
        
        console.group(`${this.results[i].name} vs ${this.results[0].name}`);
        
        // FPS change (higher is better)
        const fpsDiff = ((current.fps / baseline.fps) - 1) * 100;
        console.log(`FPS: ${current.fps.toFixed(1)} (${fpsDiff >= 0 ? '+' : ''}${fpsDiff.toFixed(1)}%)`);
        
        // Frame time change (lower is better)
        const frameTimeDiff = ((baseline.frameTime / current.frameTime) - 1) * 100;
        console.log(`Frame Time: ${current.frameTime.toFixed(2)}ms (${frameTimeDiff >= 0 ? '+' : ''}${frameTimeDiff.toFixed(1)}%)`);
        
        // Memory change (lower is better) if available
        if (current.memoryUsed !== undefined && baseline.memoryUsed !== undefined) {
          const memoryDiff = ((baseline.memoryUsed / current.memoryUsed) - 1) * 100;
          console.log(`Memory: ${current.memoryUsed}MB (${memoryDiff >= 0 ? '+' : ''}${memoryDiff.toFixed(1)}%)`);
        }
        
        // Draw calls change (lower is better)
        const callsDiff = ((baseline.calls / current.calls) - 1) * 100;
        console.log(`Draw Calls: ${current.calls} (${callsDiff >= 0 ? '+' : ''}${callsDiff.toFixed(1)}%)`);
        
        // Triangle count change (neutral)
        const trianglesDiff = ((current.triangles / baseline.triangles) - 1) * 100;
        console.log(`Triangles: ${current.triangles.toLocaleString()} (${trianglesDiff >= 0 ? '+' : ''}${trianglesDiff.toFixed(1)}%)`);
        
        console.groupEnd();
      }
      
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  /**
   * Creates an HTML report for the benchmark results
   * @returns HTML string with the report
   */
  createHtmlReport(): string {
    if (this.results.length === 0) {
      return "<p>No benchmark results available</p>";
    }

    let html = `
      <style>
        .benchmark-report {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
        }
        .benchmark-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .benchmark-table th, .benchmark-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: right;
        }
        .benchmark-table th {
          background-color: #f2f2f2;
          text-align: center;
        }
        .benchmark-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .benchmark-table tr:hover {
          background-color: #f5f5f5;
        }
        .benchmark-table td:first-child {
          text-align: left;
          font-weight: bold;
        }
        .positive-change {
          color: green;
        }
        .negative-change {
          color: red;
        }
      </style>
      <div class="benchmark-report">
        <h2>Performance Benchmark Results</h2>
        <table class="benchmark-table">
          <tr>
            <th>Test</th>
            <th>FPS</th>
            <th>Frame Time (ms)</th>
            <th>Memory (MB)</th>
            <th>Triangles</th>
            <th>Draw Calls</th>
            <th>Meshes</th>
            <th>Lights</th>
          </tr>
    `;

    this.results.forEach((result) => {
      const { averages } = result;
      
      html += `
        <tr>
          <td>${result.name}</td>
          <td>${averages.fps.toFixed(1)}</td>
          <td>${averages.frameTime.toFixed(2)}</td>
          <td>${averages.memoryUsed !== undefined ? averages.memoryUsed : 'N/A'}</td>
          <td>${averages.triangles.toLocaleString()}</td>
          <td>${averages.calls}</td>
          <td>${averages.meshes}</td>
          <td>${averages.lights}</td>
        </tr>
      `;
    });

    html += `
      </table>
    `;

    // Add comparison section if multiple tests
    if (this.results.length > 1) {
      const baseline = this.results[0].averages;
      
      html += `
        <h3>Performance Comparison (relative to ${this.results[0].name})</h3>
        <table class="benchmark-table">
          <tr>
            <th>Test</th>
            <th>FPS</th>
            <th>Frame Time</th>
            <th>Memory</th>
            <th>Draw Calls</th>
          </tr>
      `;
      
      for (let i = 1; i < this.results.length; i++) {
        const current = this.results[i].averages;
        
        // Calculate differences
        const fpsDiff = ((current.fps / baseline.fps) - 1) * 100;
        const frameTimeDiff = ((baseline.frameTime / current.frameTime) - 1) * 100;
        
        let memoryText = 'N/A';
        if (current.memoryUsed !== undefined && baseline.memoryUsed !== undefined) {
          const memoryDiff = ((baseline.memoryUsed / current.memoryUsed) - 1) * 100;
          memoryText = `${current.memoryUsed} <span class="${memoryDiff >= 0 ? 'positive-change' : 'negative-change'}">(${memoryDiff >= 0 ? '+' : ''}${memoryDiff.toFixed(1)}%)</span>`;
        }
        
        const callsDiff = ((baseline.calls / current.calls) - 1) * 100;
        
        html += `
          <tr>
            <td>${this.results[i].name}</td>
            <td>${current.fps.toFixed(1)} <span class="${fpsDiff >= 0 ? 'positive-change' : 'negative-change'}">(${fpsDiff >= 0 ? '+' : ''}${fpsDiff.toFixed(1)}%)</span></td>
            <td>${current.frameTime.toFixed(2)} <span class="${frameTimeDiff >= 0 ? 'positive-change' : 'negative-change'}">(${frameTimeDiff >= 0 ? '+' : ''}${frameTimeDiff.toFixed(1)}%)</span></td>
            <td>${memoryText}</td>
            <td>${current.calls} <span class="${callsDiff >= 0 ? 'positive-change' : 'negative-change'}">(${callsDiff >= 0 ? '+' : ''}${callsDiff.toFixed(1)}%)</span></td>
          </tr>
        `;
      }
      
      html += `
        </table>
      `;
    }

    html += `
      </div>
    `;

    return html;
  }
}

/**
 * Creates a performance benchmark with the given options
 * @param metricsCallback Callback for collecting metrics
 * @param options Benchmark options
 * @returns The performance benchmark instance
 */
export const createPerformanceBenchmark = (
  metricsCallback: (metrics?: PerformanceMetrics) => PerformanceMetrics,
  options?: Partial<BenchmarkOptions>
): PerformanceBenchmark => {
  return new PerformanceBenchmark(metricsCallback, options);
};