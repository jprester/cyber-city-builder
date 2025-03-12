import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Import from modular structure
import { assetManager } from "./lib/three/managers/assetManager";
import { createCityBuilder } from "./lib/three/builders/cityBuilder";
import { createCityEnvironment } from "./lib/three/environment/cityEnvironment";
import { cityConfig, performanceConfig, highQualityConfig } from "./lib/three/config/cityConfig";

/**
 * Initialize Three.js scene with a cyberpunk city
 * @param container HTML container to render the scene in
 * @param quality Optional quality setting ('high', 'low', or default)
 * @returns Cleanup function
 */
export const initThreeScene = (
  container: HTMLDivElement, 
  quality?: 'high' | 'low'
) => {
  // Setup scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Setup camera
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 20, 30);

  // Setup renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Add orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // adds smooth damping effect
  controls.dampingFactor = 0.05;
  controls.target.set(0, 10, 0);

  // Select configuration based on quality setting
  const getConfigByQuality = () => {
    switch (quality) {
      case 'high':
        console.log('Using high quality configuration');
        return highQualityConfig;
      case 'low':
        console.log('Using performance (low quality) configuration');
        return performanceConfig;
      default:
        console.log('Using default quality configuration');
        return cityConfig;
    }
  };
  
  // Get configuration
  const config = getConfigByQuality();

  // Create city builder and environment managers with configuration
  const cityBuilder = createCityBuilder(scene);
  const environment = createCityEnvironment(scene, config.environment);
  
  /**
   * Initialize the scene with buildings and environment
   */
  const init = async () => {
    try {
      console.log("Initializing city scene...");
      
      // Build the city with the buildings defined in the config
      await cityBuilder.buildCity(config);
      
      // Set up the environment (ground, roads, lights) using the config
      environment.initialize();
      
      console.log("City scene initialized successfully");
    } catch (error) {
      console.error("Error initializing city scene:", error);
    }
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
    
    renderer.render(scene, camera);
  };
  animate();
  
  // Return cleanup function
  return () => {
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
