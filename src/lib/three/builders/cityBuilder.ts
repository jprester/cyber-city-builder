import * as THREE from "three";
import { assetManager } from "../managers/assetManager";
import type { CityConfig, BuildingTexture } from "../types";

/**
 * City Builder class for creating and placing buildings
 */
export class CityBuilder {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Places a 3D model in the scene with specified position, scale, and rotation
   * @param model The 3D model to place
   * @param position Position [x, y, z]
   * @param scale Scale [x, y, z]
   * @param rotation Rotation in radians [x, y, z]
   * @returns The placed model object
   */
  placeModel(
    model: THREE.Object3D,
    position: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
    rotation: [number, number, number] = [0, 0, 0]
  ): THREE.Object3D {
    // Clone the model to avoid modifying the original
    const placedModel = model.clone();

    // Apply transformations
    placedModel.position.set(position[0], position[1], position[2]);
    placedModel.scale.set(scale[0], scale[1], scale[2]);
    placedModel.rotation.set(rotation[0], rotation[1], rotation[2]);

    // Add to scene
    this.scene.add(placedModel);

    return placedModel;
  }

  /**
   * Loads and places a 3D model in the scene with specified properties
   * @param modelPath Path to the model file
   * @param position Position [x, y, z]
   * @param scale Scale [x, y, z]
   * @param rotation Rotation in radians [x, y, z]
   * @param textures Optional array of textures to apply to the model
   * @returns Promise resolving to the placed model or null if loading failed
   */
  async loadAndPlaceModel(
    modelPath: string,
    position: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
    rotation: [number, number, number] = [0, 0, 0],
    textures?: BuildingTexture[]
  ): Promise<THREE.Object3D | null> {
    try {
      const model = await assetManager.loadModel(modelPath);

      if (!model) {
        console.error(`Failed to place model ${modelPath} - loading failed`);
        return null;
      }

      // Apply textures if provided
      if (textures && textures.length > 0) {
        await this.applyTexturesToModel(model, textures);
      }

      return this.placeModel(model, position, scale, rotation);
    } catch (error) {
      console.error(`Error placing model ${modelPath}:`, error);
      return null;
    }
  }

  /**
   * Applies textures to a model
   * @param model The 3D model to apply textures to
   * @param textures Array of textures to apply
   */
  private async applyTexturesToModel(
    model: THREE.Object3D,
    textures: BuildingTexture[]
  ): Promise<void> {
    console.debug(`Applying ${textures.length} textures to model`);
    
    // Load all textures in parallel
    const texturePromises = textures.map(async (textureConfig) => {
      const texture = await assetManager.loadTexture(textureConfig.texturePath);
      return { config: textureConfig, texture };
    });

    const loadedTextures = await Promise.all(texturePromises);
    
    // Count how many materials we applied textures to
    let materialCount = 0;
    
    // Apply textures to all meshes in the model
    model.traverse((node) => {
      if (node instanceof THREE.Mesh && node.material) {
        // Handle materials (could be an array or a single material)
        const materials = Array.isArray(node.material) 
          ? node.material 
          : [node.material];
        
        materials.forEach((material) => {
          materialCount++;
          console.debug(`Processing material: ${material.type}`);
          
          // This handles both MeshStandardMaterial and MeshPhongMaterial (common in OBJ files)
          // Apply each texture based on its type
          loadedTextures.forEach(({ config, texture }) => {
            if (!texture) return;
            
            console.debug(`Applying texture ${config.type} to material ${material.type}`);
            
            // Set repeat, offset and rotation if specified
            if (config.repeat) {
              texture.repeat.set(config.repeat[0], config.repeat[1]);
              texture.wrapS = THREE.RepeatWrapping;
              texture.wrapT = THREE.RepeatWrapping;
            }
            
            if (config.offset) {
              texture.offset.set(config.offset[0], config.offset[1]);
            }
            
            if (config.rotation) {
              texture.rotation = config.rotation;
            }
            
            // Apply the texture to the appropriate material property based on material type
            // We need to use typescript type guards and instanceof to safely apply textures
            switch (config.type) {
              case "map":
                // All materials support map
                if ('map' in material) {
                  material.map = texture;
                  material.needsUpdate = true;
                }
                break;
                
              case "normalMap":
                // Check if this material type supports normal maps
                if ('normalMap' in material) {
                  material.normalMap = texture;
                  material.needsUpdate = true;
                }
                break;
                
              case "roughnessMap":
                // Only MeshStandardMaterial has roughnessMap
                if (material instanceof THREE.MeshStandardMaterial) {
                  material.roughnessMap = texture;
                  material.needsUpdate = true;
                }
                break;
                
              case "metalnessMap":
                // Only MeshStandardMaterial has metalnessMap
                if (material instanceof THREE.MeshStandardMaterial) {
                  material.metalnessMap = texture;
                  material.needsUpdate = true;
                }
                break;
                
              case "emissiveMap":
                // Both MeshStandardMaterial and MeshPhongMaterial have emissiveMap
                if ('emissiveMap' in material && 'emissive' in material) {
                  material.emissiveMap = texture;
                  material.emissive = new THREE.Color(0xffffff);
                  
                  if (config.intensity !== undefined && 'emissiveIntensity' in material) {
                    material.emissiveIntensity = config.intensity;
                  }
                  material.needsUpdate = true;
                }
                break;
                
              case "aoMap":
                // Check if material supports ambient occlusion maps
                if ('aoMap' in material) {
                  material.aoMap = texture;
                  material.needsUpdate = true;
                }
                break;
            }
          });
        });
      }
    });
    
    console.debug(`Applied textures to ${materialCount} materials in the model`);
  }

  /**
   * Gets all asset paths (models and textures) used in the city configuration
   * @param cityConfig The city configuration
   * @returns Array of unique asset paths
   */
  getAssetPaths(cityConfig: CityConfig): string[] {
    // Get unique model and texture paths
    const assetPaths = new Set<string>();

    cityConfig.buildings.forEach((building) => {
      // Add model path
      assetPaths.add(building.modelPath);

      // Add texture paths if any
      if (building.textures) {
        building.textures.forEach((texture) => {
          assetPaths.add(texture.texturePath);
        });
      }
    });

    return Array.from(assetPaths);
  }

  /**
   * Gets all model paths used in the city configuration
   * @param cityConfig The city configuration
   * @returns Array of unique model paths
   */
  getModelPaths(cityConfig: CityConfig): string[] {
    // Get unique model paths
    const modelPaths = new Set<string>();

    cityConfig.buildings.forEach((building) => {
      modelPaths.add(building.modelPath);
    });

    return Array.from(modelPaths);
  }

  /**
   * Preloads all assets (models and textures) needed for the city
   * @param cityConfig The city configuration
   * @returns Promise resolving when all assets are preloaded
   */
  async preloadAssets(cityConfig: CityConfig): Promise<void> {
    const assetPaths = this.getAssetPaths(cityConfig);
    console.log(
      `Preloading ${assetPaths.length} unique assets (models and textures)...`
    );

    await assetManager.preloadAssets(assetPaths);
  }

  /**
   * Preloads all models needed for the city
   * @param cityConfig The city configuration
   * @returns Promise resolving when all models are preloaded
   */
  async preloadModels(cityConfig: CityConfig): Promise<void> {
    const modelPaths = this.getModelPaths(cityConfig);
    console.log(`Preloading ${modelPaths.length} unique models...`);

    await assetManager.preloadAssets(modelPaths);
  }

  /**
   * Builds a city by placing multiple building models
   * @param cityConfig The city configuration
   * @param preloadAssets Whether to preload assets before building (default: false)
   * @returns Promise resolving when all buildings are placed
   */
  async buildCity(
    cityConfig: CityConfig,
    preloadAssets = false
  ): Promise<void> {
    // Preload assets if requested
    if (preloadAssets) {
      await this.preloadAssets(cityConfig);
    }

    // Place all buildings
    const buildingPromises = cityConfig.buildings.map((building) =>
      this.loadAndPlaceModel(
        building.modelPath,
        building.position,
        building.scale,
        building.rotation,
        building.textures
      )
    );

    await Promise.all(buildingPromises);
    console.log(`Placed ${cityConfig.buildings.length} buildings in the scene`);
  }
}

/**
 * Create a city builder factory function
 * @param scene The Three.js scene
 * @returns A CityBuilder instance
 */
export const createCityBuilder = (scene: THREE.Scene): CityBuilder => {
  return new CityBuilder(scene);
};
