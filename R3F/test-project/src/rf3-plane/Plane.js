import React, { Suspense } from 'react'
import { Canvas } from 'react-three-fiber'
import { OrbitControls } from 'drei';
import { Physics } from '@react-three/cannon'
import Surface from "./Surface"

const Plane = () => {
    return (
        <Canvas className='canvas' camera={{ position: [0, 10, 0] }} >
            <OrbitControls />
            <Physics>
                <Suspense fallback={null}>
                    <Surface />
                </Suspense>
            </Physics>
        </Canvas>
    )
}

export default Plane
