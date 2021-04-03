import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas } from 'react-three-fiber';
import { Sky, Loader } from "drei"
import { Physics } from "use-cannon";

import { Ground } from "./components/Ground"
import { Player } from "./components/Player"
import { Cube } from "./components/Cube"
import { log } from 'three';

function App() {
  const firstTime = useRef(true)

  useEffect(() => {
    console.log(firstTime.current)
    if (firstTime.current) {
      firstTime.current = false
    }
  }, [])

  return (<>
    <Canvas onContextMenu={(e) => { e.preventDefault(); return false }} shadowMap sRGB>
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.25} />
      <pointLight castShadow intensity={0.7} position={[100, 100, 100]} />
      <Physics gravity={[0, -30, 0]}>
        <Ground position={[0, 0.5, 0]} />
        <Suspense>
          <Player position={[0, 3, 10]} />
        </Suspense>
        <Cube position={[0, 1, 0]} type="wood" />
      </Physics>
    </Canvas>
    {firstTime.current === true ? <Loader /> : () => { console.log("asd") }}
  </>
  )
}

export default App;
