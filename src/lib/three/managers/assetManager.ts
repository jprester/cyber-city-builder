import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Asset Manager for handling 3D model loading and caching
 */
export class AssetManager {
  private modelCache: Map<string, THREE.Object3D>;
  
  constructor() {
    this.modelCache = new Map<string, THREE.Object3D>();
  }
  
  /**
   * Loads a 3D model and caches it for reuse
   * @param modelPath Path to the 3D model file
   * @returns Promise resolving to the loaded model or null if loading failed
   */
  async loadModel(modelPath: string): Promise<THREE.Object3D | null> {
    // Check if model is already cached
    if (this.modelCache.has(modelPath)) {
      const cachedModel = this.modelCache.get(modelPath);
      // Return a clone of the cached model
      return cachedModel ? cachedModel.clone() : null;
    }
    
    const loader = new GLTFLoader();
    
    try {
      return new Promise((resolve) => {
        loader.load(
          modelPath,
          (gltf) => {
            console.log(`Model loaded: ${modelPath}`);
            
            // Setup the model
            const model = gltf.scene;
            
            // Center the model on x and z axes
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.set(-center.x, 0, -center.z);
            
            // Enable shadows
            model.traverse((node) => {
              if (node instanceof THREE.Mesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            
            // Cache the model for future use
            this.modelCache.set(modelPath, model.clone());
            
            resolve(model);
          },
          (xhr) => {
            // Optional progress callback
            const progress = ((xhr.loaded / xhr.total) * 100).toFixed(0);
            console.log(`Loading ${modelPath}: ${progress}%`);
          },
          (error) => {
            console.error(`Error loading model ${modelPath}:`, error);
            resolve(null);
          }
        );
      });
    } catch (error) {
      console.error(`Exception loading model ${modelPath}:`, error);
      return null;
    }
  }
  
  /**
   * Clears all cached models from memory
   */
  clearCache(): void {
    this.modelCache.clear();
  }
}

// Export a singleton instance
export const assetManager = new AssetManager();