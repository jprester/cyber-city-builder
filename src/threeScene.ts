import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Import from modular structure
import { assetManager } from "./lib/three/managers/assetManager";
import { createCityBuilder } from "./lib/three/builders/cityBuilder";
import { createCityEnvironment } from "./lib/three/environment/cityEnvironment";
import {
  cityConfig,
  performanceConfig,
  highQualityConfig,
} from "./lib/three/config/cityConfig";
import { createPerformanceTest } from "./lib/three/components/performanceTest";
import { createLoadingScreen } from "./lib/three/components/loadingScreen";

/**
 * Initialize Three.js scene with a cyberpunk city
 * @param container HTML container to render the scene in
 * @param quality Optional quality setting ('high', 'low', or default)
 * @param enablePerformanceMonitoring Whether to enable performance monitoring tools
 * @returns Cleanup function
 */
export const initThreeScene = (
  container: HTMLDivElement,
  quality?: "high" | "low",
  enablePerformanceMonitoring = false
) => {
  // Setup scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Setup camera based on human scale (eye level is ~1.6-1.8m)
  const camera = new THREE.PerspectiveCamera(
    65, // Slightly wider FoV for urban environment (human eye is ~60-70°)
    window.innerWidth / window.innerHeight,
    0.1, // Near plane at 10cm
    1000 // Far plane at 1km for distant buildings
  );

  // Position camera at human eye level (1.7m) and 30m back from scene center
  camera.position.set(0, 1.7, 30);

  // Setup renderer with appropriate pixel ratio for device
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance", // Request high-performance GPU
  });
  // Use a maximum pixel ratio of 2 to prevent excessive rendering load on high-DPI devices
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Add orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // adds smooth damping effect
  controls.dampingFactor = 0.05;

  // Set controls target to look slightly upward at buildings
  controls.target.set(0, 10, 0);

  // Set minimum distance to prevent going inside objects
  controls.minDistance = 1.0; // 1 meter minimum distance
  controls.maxDistance = 150; // 150 meters maximum distance

  // Select configuration based on quality setting
  const getConfigByQuality = () => {
    switch (quality) {
      case "high":
        console.log("Using high quality configuration");
        return highQualityConfig;
      case "low":
        console.log("Using performance (low quality) configuration");
        return performanceConfig;
      default:
        console.log("Using default quality configuration");
        return cityConfig;
    }
  };

  // Get configuration
  const config = getConfigByQuality();

  // Create city builder and environment managers with configuration
  const cityBuilder = createCityBuilder(scene);
  const environment = createCityEnvironment(scene, config.environment);

  // Performance monitoring
  let performanceTest: ReturnType<typeof createPerformanceTest> | null = null;

  if (enablePerformanceMonitoring) {
    console.log("Initializing performance monitoring...");
    performanceTest = createPerformanceTest(renderer, scene, container);
    performanceTest.init();

    // Add keyboard shortcut to toggle stats panel (press 'P')
    window.addEventListener("keydown", (event) => {
      if (event.key === "p" || event.key === "P") {
        // Get current metrics and log them
        const metrics = performanceTest?.perfMonitor.getMetrics();
        if (metrics) {
          console.group("Current Performance Metrics");
          console.log(`FPS: ${metrics.fps.toFixed(1)}`);
          console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
          console.log(`Triangles: ${metrics.triangles.toLocaleString()}`);
          console.log(`Draw Calls: ${metrics.calls}`);
          console.log(`Meshes: ${metrics.meshes}`);
          console.groupEnd();
        }
      }
    });
  }

  /**
   * Initialize the scene with buildings and environment
   */
  const init = async () => {
    try {
      console.log("Initializing city scene...");

      // Create loading screen
      const loadingScreen = createLoadingScreen(container, {
        title: "Loading Cyber City",
        subtitle: "Preparing your immersive urban experience...",
        accentColor: "#00aaff",
        showAssetDetails: true,
        maxAssetsToShow: 5,
      });

      // Show loading screen
      loadingScreen.show();

      // Mark the start time for initialization
      const startTime = performance.now();

      // Build the city with the buildings defined in the config (with preloading)
      await cityBuilder.buildCity(config, true);

      // Set up the environment (ground, roads, lights) using the config
      environment.initialize();

      // Mark buildings for performance monitoring
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          object.parent &&
          object.parent.userData.type !== "building"
        ) {
          object.parent.userData.type = "building";
        }
      });

      // Log initialization time
      const endTime = performance.now();
      console.log(
        `City scene initialized successfully in ${(
          (endTime - startTime) /
          1000
        ).toFixed(2)}s`
      );

      // Log overall scene statistics
      logSceneStatistics();
    } catch (error) {
      console.error("Error initializing city scene:", error);
    }
  };

  /**
   * Log scene statistics
   */
  const logSceneStatistics = () => {
    // Count scene objects
    let meshCount = 0;
    let geometryCount = 0;
    let materialCount = 0;
    let lightCount = 0;
    let textureCount = 0;
    let triangleCount = 0;

    // Track unique geometries and materials
    const uniqueGeometries = new Set<THREE.BufferGeometry>();
    const uniqueMaterials = new Set<THREE.Material>();

    // Traverse scene to count objects
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshCount++;

        // Count triangles in geometry
        if (object.geometry) {
          geometryCount++;
          uniqueGeometries.add(object.geometry);

          if (object.geometry instanceof THREE.BufferGeometry) {
            const index = object.geometry.index;
            const position = object.geometry.attributes.position;

            if (position) {
              if (index) {
                triangleCount += index.count / 3;
              } else {
                triangleCount += position.count / 3;
              }
            }
          }
        }

        // Count materials
        if (object.material) {
          if (Array.isArray(object.material)) {
            materialCount += object.material.length;
            object.material.forEach((mat) => uniqueMaterials.add(mat));
          } else {
            materialCount++;
            uniqueMaterials.add(object.material);
          }
        }
      } else if (object instanceof THREE.Light) {
        lightCount++;
      }
    });

    // Count textures
    uniqueMaterials.forEach((material) => {
      const mat = material as any;
      if (mat.map) textureCount++;
      if (mat.normalMap) textureCount++;
      if (mat.specularMap) textureCount++;
      if (mat.emissiveMap) textureCount++;
      if (mat.roughnessMap) textureCount++;
      if (mat.metalnessMap) textureCount++;
    });

    // Log statistics
    console.group("Scene Statistics");
    console.log(`Meshes: ${meshCount}`);
    console.log(`Lights: ${lightCount}`);
    console.log(
      `Geometries: ${geometryCount} (${uniqueGeometries.size} unique)`
    );
    console.log(`Materials: ${materialCount} (${uniqueMaterials.size} unique)`);
    console.log(`Textures: ${textureCount}`);
    console.log(`Triangles: ${triangleCount.toLocaleString()}`);
    console.groupEnd();
  };

  // Start initialization
  init();

  // Handle window resize
  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", handleResize);

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Update performance monitoring
    if (performanceTest) {
      performanceTest.update();
    }

    renderer.render(scene, camera);
  };
  animate();

  // Return cleanup function
  return () => {
    // Dispose performance monitoring
    if (performanceTest) {
      performanceTest.dispose();
    }

    // Clear model cache
    assetManager.clearCache();

    // Remove event listeners
    window.removeEventListener("resize", handleResize);

    // Remove renderer from DOM
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }

    // Dispose all geometries and materials
    scene.traverse((object) => {
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

    // Dispose renderer and controls
    renderer.dispose();
    controls.dispose();
  };
};
