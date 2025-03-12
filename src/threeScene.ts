import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Type definitions for building placement
interface BuildingPlacement {
  modelPath: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
}

export const initThreeScene = (container: HTMLDivElement) => {
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

  // Asset manager to cache loaded models
  const assetManager = {
    modelCache: new Map<string, THREE.Object3D>(),

    /**
     * Loads a 3D model and caches it for reuse
     * @param modelPath Path to the 3D model file
     * @returns Promise resolving to the loaded model or null if loading failed
     */
    loadModel: async (modelPath: string): Promise<THREE.Object3D | null> => {
      // Check if model is already cached
      if (assetManager.modelCache.has(modelPath)) {
        const cachedModel = assetManager.modelCache.get(modelPath);
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
              assetManager.modelCache.set(modelPath, model.clone());

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
    },

    /**
     * Clears all cached models from memory
     */
    clearCache: () => {
      assetManager.modelCache.clear();
    },
  };

  // Building placer functionality
  const cityBuilder = {
    /**
     * Places a 3D model in the scene with specified position, scale, and rotation
     * @param model The 3D model to place
     * @param position Position [x, y, z]
     * @param scale Scale [x, y, z]
     * @param rotation Rotation in radians [x, y, z]
     * @returns The placed model object
     */
    placeModel: (
      model: THREE.Object3D,
      position: [number, number, number] = [0, 0, 0],
      scale: [number, number, number] = [1, 1, 1],
      rotation: [number, number, number] = [0, 0, 0]
    ): THREE.Object3D => {
      // Clone the model to avoid modifying the original
      const placedModel = model.clone();

      // Apply transformations
      placedModel.position.set(position[0], position[1], position[2]);
      placedModel.scale.set(scale[0], scale[1], scale[2]);
      placedModel.rotation.set(rotation[0], rotation[1], rotation[2]);

      // Add to scene
      scene.add(placedModel);

      return placedModel;
    },

    /**
     * Loads and places a 3D model in the scene with specified properties
     * @param modelPath Path to the model file
     * @param position Position [x, y, z]
     * @param scale Scale [x, y, z]
     * @param rotation Rotation in radians [x, y, z]
     * @returns Promise resolving to the placed model or null if loading failed
     */
    loadAndPlaceModel: async (
      modelPath: string,
      position: [number, number, number] = [0, 0, 0],
      scale: [number, number, number] = [1, 1, 1],
      rotation: [number, number, number] = [0, 0, 0]
    ): Promise<THREE.Object3D | null> => {
      try {
        const model = await assetManager.loadModel(modelPath);

        if (!model) {
          console.error(`Failed to place model ${modelPath} - loading failed`);
          return null;
        }

        return cityBuilder.placeModel(model, position, scale, rotation);
      } catch (error) {
        console.error(`Error placing model ${modelPath}:`, error);
        return null;
      }
    },

    /**
     * Builds a city by placing multiple building models
     * @param buildings Array of building placement configurations
     * @returns Promise resolving when all buildings are placed
     */
    buildCity: async (buildings: BuildingPlacement[]): Promise<void> => {
      const buildingPromises = buildings.map((building) =>
        cityBuilder.loadAndPlaceModel(
          building.modelPath,
          building.position,
          building.scale,
          building.rotation
        )
      );

      await Promise.all(buildingPromises);
      console.log(`Placed ${buildings.length} buildings in the scene`);
    },
  };

  // Define the buildings to place in the city
  const cityBuildings: BuildingPlacement[] = [
    {
      modelPath: "./src/assets/cyberpunk-apartment-building.glb",
      position: [20, 20, 20],
      scale: [40, 40, 40],
      rotation: [0, 0, 0],
    },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building2.glb",
    //   position: [12, 0, 0],
    //   scale: [0.8, 1.2, 0.8],
    //   rotation: [0, Math.PI / 4, 0],
    // },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building.glb",
    //   position: [0, 0, 12],
    //   scale: [1.3, 0.9, 1.3],
    //   rotation: [0, Math.PI / 6, 0],
    // },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building2.glb",
    //   position: [12, 0, 12],
    //   scale: [1, 1.5, 1],
    //   rotation: [0, -Math.PI / 4, 0],
    // },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building2.glb",
    //   position: [-12, 0, 0],
    //   scale: [1.2, 0.8, 1.2],
    //   rotation: [0, Math.PI / 3, 0],
    // },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building.glb",
    //   position: [-12, 0, -12],
    //   scale: [0.9, 1.4, 0.9],
    //   rotation: [0, -Math.PI / 6, 0],
    // },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building2.glb",
    //   position: [0, 0, -12],
    //   scale: [1.1, 1.1, 1.1],
    //   rotation: [0, Math.PI / 2, 0],
    // },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building.glb",
    //   position: [-12, 0, 12],
    //   scale: [1.4, 0.7, 1.4],
    //   rotation: [0, -Math.PI / 3, 0],
    // },
    // {
    //   modelPath: "./src/assets/cyberpunk-apartment-building2.glb",
    //   position: [12, 0, -12],
    //   scale: [0.7, 1.3, 0.7],
    //   rotation: [0, 0, 0],
    // },
  ];

  // CityEnvironment class for creating city infrastructure
  const cityEnvironment = {
    /**
     * Creates ground plane and roads for the city
     */
    createGround: () => {
      // Main ground plane
      const groundGeometry = new THREE.PlaneGeometry(100, 100);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      ground.receiveShadow = true;
      scene.add(ground);

      // Create road material
      const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.6,
      });

      // Add roads between buildings (horizontal)
      const mainRoadGeometry = new THREE.PlaneGeometry(90, 6);
      const mainRoad = new THREE.Mesh(mainRoadGeometry, roadMaterial);
      mainRoad.rotation.x = -Math.PI / 2;
      mainRoad.position.y = 0.01; // Slightly above ground to prevent z-fighting
      scene.add(mainRoad);

      // Add roads between buildings (vertical)
      const crossRoadGeometry = new THREE.PlaneGeometry(6, 90);
      const crossRoad = new THREE.Mesh(crossRoadGeometry, roadMaterial);
      crossRoad.rotation.x = -Math.PI / 2;
      crossRoad.position.y = 0.01;
      scene.add(crossRoad);

      // Add intersection in the middle
      const intersectionGeometry = new THREE.PlaneGeometry(6, 6);
      const intersection = new THREE.Mesh(intersectionGeometry, roadMaterial);
      intersection.rotation.x = -Math.PI / 2;
      intersection.position.y = 0.02; // Slightly above roads
      scene.add(intersection);

      return { ground, mainRoad, crossRoad, intersection };
    },

    /**
     * Creates street lights for the city
     */
    createStreetLights: () => {
      const streetLights = new THREE.Group();

      // Street light pole and lamp geometry
      const createStreetLight = (x: number, z: number, rotationY = 0) => {
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
          color: 0x888888,
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(x, 2.5, z);
        pole.castShadow = true;

        // Light bulb
        const lampGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const lampMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffcc,
          emissive: 0xffffcc,
          emissiveIntensity: 1,
        });
        const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
        lamp.position.set(x, 5, z);

        // Light source
        const light = new THREE.PointLight(0xffffcc, 1, 15);
        light.position.set(x, 5, z);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 20;

        // Group elements
        const streetLight = new THREE.Group();
        streetLight.add(pole);
        streetLight.add(lamp);
        streetLight.add(light);
        streetLight.rotation.y = rotationY;

        return streetLight;
      };

      // Add street lights at intersections
      const lightPositions = [
        { x: -12, z: -6, rotation: 0 },
        { x: 0, z: -6, rotation: 0 },
        { x: 12, z: -6, rotation: 0 },
        { x: -12, z: 6, rotation: 0 },
        { x: 0, z: 6, rotation: 0 },
        { x: 12, z: 6, rotation: 0 },
        { x: -6, z: -12, rotation: Math.PI / 2 },
        { x: -6, z: 0, rotation: Math.PI / 2 },
        { x: -6, z: 12, rotation: Math.PI / 2 },
        { x: 6, z: -12, rotation: Math.PI / 2 },
        { x: 6, z: 0, rotation: Math.PI / 2 },
        { x: 6, z: 12, rotation: Math.PI / 2 },
      ];

      lightPositions.forEach((pos) => {
        const light = createStreetLight(pos.x, pos.z, pos.rotation);
        streetLights.add(light);
      });

      scene.add(streetLights);
      return streetLights;
    },

    /**
     * Sets up the lighting for the scene
     */
    setupLighting: () => {
      // Add ambient and directional lights for overall scene lighting
      const ambientLight = new THREE.AmbientLight(0x444444, 0.5);
      scene.add(ambientLight);

      // Main directional light with shadows (like sunlight)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(20, 30, 20);
      directionalLight.castShadow = true;

      // Configure shadow properties for large scene
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 100;
      directionalLight.shadow.camera.left = -50;
      directionalLight.shadow.camera.right = 50;
      directionalLight.shadow.camera.top = 50;
      directionalLight.shadow.camera.bottom = -50;
      directionalLight.shadow.bias = -0.001;

      scene.add(directionalLight);

      // Add a softer fill light from the opposite side
      const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
      fillLight.position.set(-20, 20, -20);
      scene.add(fillLight);

      // Add fog to create atmosphere
      scene.fog = new THREE.FogExp2(0x090909, 0.01);

      return { ambientLight, directionalLight, fillLight };
    },
  };

  // Initialize the scene
  const init = async () => {
    // Build the city with the defined buildings
    await cityBuilder.buildCity(cityBuildings);

    // Set up the environment
    cityEnvironment.createGround();
    // cityEnvironment.createStreetLights();
    cityEnvironment.setupLighting();

    console.log("City scene initialized successfully");
  };

  // Start the initialization
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
