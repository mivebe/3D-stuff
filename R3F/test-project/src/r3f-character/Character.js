import React, { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from 'react-three-fiber'
import { OrbitControls, PerspectiveCamera } from 'drei';
import { Physics } from '@react-three/cannon'
import Warrior from "./Warrior"

const Character = () => {

    const ref = useRef()
    const planeref = useRef()

    function Camera(props) {
        const ref = useRef()
        const { setDefaultCamera } = useThree()
        // Make the camera known to the system
        useEffect(() => void setDefaultCamera(ref.current), [])
        // Update it every frame
        useFrame(() => ref.current.updateMatrixWorld())
        return <PerspectiveCamera ref={ref} {...props} />
    }


    return (
        <Canvas className='canvas'>
            <OrbitControls />
            <directionalLight intensity={0.5} />
            <ambientLight intensity={0.2} />
            {/* <Camera position={[5, 5, 20]} rotation={[0, 0, 0]} near={1} far={1000} /> */}
            <Physics>
                <Suspense fallback={null}>
                    <Warrior />
                </Suspense>
            </Physics>

        </Canvas>
    )
}

export default Character