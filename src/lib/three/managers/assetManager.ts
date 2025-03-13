import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

/**
 * Asset Manager for handling 3D model loading and caching
 */
/**
 * Asset loading progress event
 */
export interface AssetLoadingProgress {
  asset: string;
  progress: number;
  loaded: number;
  total: number;
  isComplete: boolean;
}

/**
 * Asset loading event listener
 */
export type AssetLoadingListener = (progress: AssetLoadingProgress) => void;

export class AssetManager {
  private modelCache: Map<string, THREE.Object3D>;
  private textureCache: Map<string, THREE.Texture>;
  private loadingListeners: AssetLoadingListener[] = [];
  private totalAssets = 0;
  private loadedAssets = 0;
  private pendingLoads: Map<string, boolean> = new Map();
  
  constructor() {
    this.modelCache = new Map<string, THREE.Object3D>();
    this.textureCache = new Map<string, THREE.Texture>();
  }
  
  /**
   * Adds a loading progress listener
   * @param listener The listener function
   */
  addLoadingListener(listener: AssetLoadingListener): void {
    this.loadingListeners.push(listener);
  }
  
  /**
   * Removes a loading progress listener
   * @param listener The listener function to remove
   */
  removeLoadingListener(listener: AssetLoadingListener): void {
    this.loadingListeners = this.loadingListeners.filter(l => l !== listener);
  }
  
  /**
   * Notifies all listeners of loading progress
   * @param progress The loading progress event
   */
  private notifyProgress(progress: AssetLoadingProgress): void {
    this.loadingListeners.forEach(listener => listener(progress));
  }
  
  /**
   * Determines if a path is likely to be a texture or a model
   * @param path Path to the asset
   * @returns True if it's likely a texture, false if it's likely a model
   */
  private isTexturePath(path: string): boolean {
    const extension = path.split('.').pop()?.toLowerCase();
    // Common texture file extensions
    const textureExtensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tga', 'tif', 'tiff', 'exr', 'hdr'];
    return textureExtensions.includes(extension || '');
  }

  /**
   * Preloads all assets in the array and tracks overall loading progress
   * @param assetPaths Array of asset paths (models and textures) to preload
   * @returns Promise that resolves when all assets are loaded
   */
  async preloadAssets(assetPaths: string[]): Promise<void> {
    this.totalAssets = assetPaths.length;
    this.loadedAssets = 0;
    this.pendingLoads.clear();
    
    // Mark all assets as pending
    assetPaths.forEach(path => this.pendingLoads.set(path, false));
    
    // Load all assets in parallel, using the appropriate loader for each asset type
    const loadPromises = assetPaths.map(path => {
      // Determine if the asset is a texture or a model
      if (this.isTexturePath(path)) {
        return this.loadTexture(path, true);
      } else {
        return this.loadModel(path, true);
      }
    });
    
    // Wait for all assets to load
    await Promise.all(loadPromises);
    
    // Notify that all assets are loaded
    this.notifyProgress({
      asset: 'all',
      progress: 100,
      loaded: this.totalAssets,
      total: this.totalAssets,
      isComplete: true
    });
  }
  
  /**
   * Gets overall loading progress
   * @returns Progress as a number between 0 and 1
   */
  getOverallProgress(): number {
    if (this.totalAssets === 0) return 1.0;
    return this.loadedAssets / this.totalAssets;
  }
  
  /**
   * Loads a 3D model and caches it for reuse
   * @param modelPath Path to the 3D model file
   * @param isPreload Whether this is part of a preload operation
   * @returns Promise resolving to the loaded model or null if loading failed
   */
  async loadModel(modelPath: string, isPreload = false): Promise<THREE.Object3D | null> {
    // Check if model is already cached
    if (this.modelCache.has(modelPath)) {
      const cachedModel = this.modelCache.get(modelPath);
      
      // If this is part of a preload operation, mark it as complete
      if (isPreload && !this.pendingLoads.get(modelPath)) {
        this.loadedAssets++;
        this.pendingLoads.set(modelPath, true);
        
        this.notifyProgress({
          asset: modelPath,
          progress: 100,
          loaded: this.loadedAssets,
          total: this.totalAssets,
          isComplete: true
        });
      }
      
      // Return a clone of the cached model
      return cachedModel ? cachedModel.clone() : null;
    }
    
    // Determine file extension to use the appropriate loader
    const fileExtension = modelPath.split('.').pop()?.toLowerCase();
    
    try {
      if (fileExtension === 'obj') {
        return await this.loadObjModel(modelPath, isPreload);
      } else {
        // Default to GLTF/GLB format
        return await this.loadGltfModel(modelPath, isPreload);
      }
    } catch (error) {
      console.error(`Exception loading model ${modelPath}:`, error);
      
      // If this is part of a preload operation, mark it as complete (even though it failed)
      if (isPreload && !this.pendingLoads.get(modelPath)) {
        this.loadedAssets++;
        this.pendingLoads.set(modelPath, true);
        
        this.notifyProgress({
          asset: modelPath,
          progress: 100,
          loaded: 0,
          total: 0,
          isComplete: true
        });
      }
      
      return null;
    }
  }
  
  /**
   * Loads a GLTF/GLB model
   * @param modelPath Path to the GLTF/GLB model file
   * @param isPreload Whether this is part of a preload operation
   * @returns Promise resolving to the loaded model or null if loading failed
   */
  private async loadGltfModel(modelPath: string, isPreload = false): Promise<THREE.Object3D | null> {
    const loader = new GLTFLoader();
    
    return new Promise((resolve) => {
      loader.load(
        modelPath,
        (gltf) => {
          console.log(`GLTF/GLB model loaded: ${modelPath}`);
          
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
          
          // If this is part of a preload operation, mark it as complete
          if (isPreload && !this.pendingLoads.get(modelPath)) {
            this.loadedAssets++;
            this.pendingLoads.set(modelPath, true);
            
            this.notifyProgress({
              asset: modelPath,
              progress: 100,
              loaded: this.loadedAssets,
              total: this.totalAssets,
              isComplete: true
            });
          }
          
          resolve(model);
        },
        (xhr) => {
          // Calculate progress percentage
          const percentComplete = xhr.loaded / xhr.total;
          const progress = Math.round(percentComplete * 100);
          
          // Log progress
          console.log(`Loading ${modelPath}: ${progress}%`);
          
          // Notify listeners of progress
          this.notifyProgress({
            asset: modelPath,
            progress: progress,
            loaded: xhr.loaded,
            total: xhr.total,
            isComplete: false
          });
        },
        (error) => {
          console.error(`Error loading GLTF/GLB model ${modelPath}:`, error);
          
          // If this is part of a preload operation, mark it as complete (even though it failed)
          if (isPreload && !this.pendingLoads.get(modelPath)) {
            this.loadedAssets++;
            this.pendingLoads.set(modelPath, true);
            
            this.notifyProgress({
              asset: modelPath,
              progress: 100,
              loaded: 0,
              total: 0,
              isComplete: true
            });
          }
          
          resolve(null);
        }
      );
    });
  }
  
  /**
   * Loads an OBJ model with optional MTL materials
   * @param modelPath Path to the OBJ model file
   * @param isPreload Whether this is part of a preload operation
   * @returns Promise resolving to the loaded model or null if loading failed
   */
  private async loadObjModel(modelPath: string, isPreload = false): Promise<THREE.Object3D | null> {
    const objLoader = new OBJLoader();
    
    // Check for corresponding MTL file
    const mtlPath = modelPath.replace('.obj', '.mtl');
    let hasMtl = false;
    
    try {
      // Try to load MTL file if it exists
      if (mtlPath !== modelPath) {
        // Test if MTL file exists by performing a HEAD request
        console.debug(`Checking for MTL file: ${mtlPath}`);
        
        try {
          const response = await fetch(mtlPath, { method: 'HEAD' });
          hasMtl = response.ok;
          
          if (hasMtl) {
            console.debug(`MTL file found for ${modelPath}`);
          } else {
            console.debug(`No MTL file found for ${modelPath} (status: ${response.status})`);
          }
        } catch (fetchError) {
          console.debug(`Error fetching MTL file ${mtlPath}: ${fetchError}`);
          hasMtl = false;
        }
        
        if (hasMtl) {
          // Load MTL materials
          const mtlLoader = new MTLLoader();
          
          // Set texture path for MTL loader to look for textures in the same directory as the MTL file
          const mtlBasePath = mtlPath.substring(0, mtlPath.lastIndexOf('/') + 1);
          mtlLoader.setPath(mtlBasePath);
          
          const materials = await new Promise<MTLLoader.MaterialCreator>((resolve, reject) => {
            mtlLoader.load(
              mtlPath,
              (materials) => {
                console.log(`MTL materials loaded for ${modelPath}`);
                resolve(materials);
              },
              undefined,
              (error) => {
                console.warn(`Failed to load MTL file ${mtlPath}:`, error);
                reject(error);
              }
            );
          });
          
          // Apply materials to OBJ loader
          materials.preload();
          objLoader.setMaterials(materials);
        }
      }
    } catch (error) {
      console.warn(`Error handling MTL file for ${modelPath}:`, error);
      // Continue without MTL
    }
    
    return new Promise((resolve) => {
      objLoader.load(
        modelPath,
        (object) => {
          console.log(`OBJ model loaded: ${modelPath}`);
          
          // Center the model on x and z axes
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          object.position.set(-center.x, 0, -center.z);
          
          // Enable shadows
          object.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              
              // Apply default material if no MTL was loaded
              if (!hasMtl && (!node.material || Array.isArray(node.material) && node.material.length === 0)) {
                node.material = new THREE.MeshStandardMaterial({
                  color: 0x808080,
                  roughness: 0.8,
                  metalness: 0.2
                });
              }
            }
          });
          
          // Cache the model for future use
          this.modelCache.set(modelPath, object.clone());
          
          // If this is part of a preload operation, mark it as complete
          if (isPreload && !this.pendingLoads.get(modelPath)) {
            this.loadedAssets++;
            this.pendingLoads.set(modelPath, true);
            
            this.notifyProgress({
              asset: modelPath,
              progress: 100,
              loaded: this.loadedAssets,
              total: this.totalAssets,
              isComplete: true
            });
          }
          
          resolve(object);
        },
        (xhr) => {
          // Calculate progress percentage
          const percentComplete = xhr.loaded / xhr.total;
          const progress = Math.round(percentComplete * 100);
          
          // Log progress
          console.log(`Loading OBJ ${modelPath}: ${progress}%`);
          
          // Notify listeners of progress
          this.notifyProgress({
            asset: modelPath,
            progress: progress,
            loaded: xhr.loaded,
            total: xhr.total,
            isComplete: false
          });
        },
        (error) => {
          console.error(`Error loading OBJ model ${modelPath}:`, error);
          
          // If this is part of a preload operation, mark it as complete (even though it failed)
          if (isPreload && !this.pendingLoads.get(modelPath)) {
            this.loadedAssets++;
            this.pendingLoads.set(modelPath, true);
            
            this.notifyProgress({
              asset: modelPath,
              progress: 100,
              loaded: 0,
              total: 0,
              isComplete: true
            });
          }
          
          resolve(null);
        }
      );
    });
  }
  
  /**
   * Loads a texture and caches it for reuse
   * @param texturePath Path to the texture file
   * @param isPreload Whether this is part of a preload operation
   * @returns Promise resolving to the loaded texture or null if loading failed
   */
  async loadTexture(texturePath: string, isPreload = false): Promise<THREE.Texture | null> {
    // Check if texture is already cached
    if (this.textureCache.has(texturePath)) {
      const cachedTexture = this.textureCache.get(texturePath);
      
      // If this is part of a preload operation, mark it as complete
      if (isPreload && !this.pendingLoads.get(texturePath)) {
        this.loadedAssets++;
        this.pendingLoads.set(texturePath, true);
        
        this.notifyProgress({
          asset: texturePath,
          progress: 100,
          loaded: this.loadedAssets,
          total: this.totalAssets,
          isComplete: true
        });
      }
      
      return cachedTexture || null;
    }
    
    const loader = new THREE.TextureLoader();
    
    try {
      return new Promise((resolve) => {
        loader.load(
          texturePath,
          (texture) => {
            console.log(`Texture loaded: ${texturePath}`);
            
            // Cache the texture for future use
            this.textureCache.set(texturePath, texture);
            
            // If this is part of a preload operation, mark it as complete
            if (isPreload && !this.pendingLoads.get(texturePath)) {
              this.loadedAssets++;
              this.pendingLoads.set(texturePath, true);
              
              this.notifyProgress({
                asset: texturePath,
                progress: 100,
                loaded: this.loadedAssets,
                total: this.totalAssets,
                isComplete: true
              });
            }
            
            resolve(texture);
          },
          (xhr) => {
            // Calculate progress percentage
            const percentComplete = xhr.loaded / xhr.total;
            const progress = Math.round(percentComplete * 100);
            
            // Log progress
            console.log(`Loading texture ${texturePath}: ${progress}%`);
            
            // Notify listeners of progress
            this.notifyProgress({
              asset: texturePath,
              progress: progress,
              loaded: xhr.loaded,
              total: xhr.total,
              isComplete: false
            });
          },
          (error) => {
            console.error(`Error loading texture ${texturePath}:`, error);
            
            // If this is part of a preload operation, mark it as complete (even though it failed)
            if (isPreload && !this.pendingLoads.get(texturePath)) {
              this.loadedAssets++;
              this.pendingLoads.set(texturePath, true);
              
              this.notifyProgress({
                asset: texturePath,
                progress: 100,
                loaded: 0,
                total: 0,
                isComplete: true
              });
            }
            
            resolve(null);
          }
        );
      });
    } catch (error) {
      console.error(`Exception loading texture ${texturePath}:`, error);
      
      // If this is part of a preload operation, mark it as complete (even though it failed)
      if (isPreload && !this.pendingLoads.get(texturePath)) {
        this.loadedAssets++;
        this.pendingLoads.set(texturePath, true);
        
        this.notifyProgress({
          asset: texturePath,
          progress: 100,
          loaded: 0,
          total: 0,
          isComplete: true
        });
      }
      
      return null;
    }
  }

  /**
   * Clears all cached models and textures from memory
   */
  clearCache(): void {
    this.modelCache.clear();
    this.textureCache.clear();
    this.loadedAssets = 0;
    this.totalAssets = 0;
    this.pendingLoads.clear();
  }
}

// Export a singleton instance
export const assetManager = new AssetManager();