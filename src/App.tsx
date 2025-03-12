import { useEffect, useRef } from "react";
import { initThreeScene } from "./threeScene";
import "./App.css";

function App() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js scene and get cleanup function
    const cleanup = initThreeScene(canvasRef.current);

    // Return cleanup function
    return cleanup;
  }, []);

  return (
    <div
      ref={canvasRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    />
  );
}

export default App;
