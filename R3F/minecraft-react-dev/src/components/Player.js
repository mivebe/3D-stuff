import React, { useEffect, useRef } from 'react';
import { useBox, useSphere } from 'use-cannon';
import { useThree, useFrame } from 'react-three-fiber';
import { FPVControls } from './FPVControls';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { Vector3 } from 'three';
import { useGLTFLoader } from 'drei';

const SPEED = 6;

export const Player = (props) => {
    const { camera } = useThree();
    const {
        moveForward,
        moveBackward,
        moveLeft,
        moveRight,
        jump,
    } = useKeyboardControls();
    const [ref, api] = useBox(() => ({
        mass: 1,
        type: 'Dynamic',
        ...props,
    }));
    // const asd = useGLTFLoader("../../../warrior.glb")
    // console.log(asd);

    const velocity = useRef([0, 0, 0]);
    useEffect(() => {
        return api.velocity.subscribe((v) => (velocity.current = v));
    }, [api.velocity]);

    useFrame(() => {
        camera.position.copy(ref.current.position);
        camera.position.z += 5
        const direction = new Vector3();

        const frontVector = new Vector3(
            0,
            0,
            (moveBackward ? 1 : 0) - (moveForward ? 1 : 0),
        );
        const sideVector = new Vector3(
            (moveLeft ? 1 : 0) - (moveRight ? 1 : 0),
            0,
            0,
        );

        direction
            .subVectors(frontVector, sideVector)
            .normalize()
            .multiplyScalar(SPEED)
            .applyEuler(camera.rotation);

        api.velocity.set(direction.x, velocity.current[1], direction.z);

        if (jump && Math.abs(velocity.current[1].toFixed(2)) < 0.05) {
            api.velocity.set(velocity.current[0], 8, velocity.current[2]);
        }
    });
    return (
        <>
            <FPVControls />
            <mesh ref={ref} >
                <boxBufferGeometry attach="geometry" />
                <meshBasicMaterial color="blue" attach="material" />
            </mesh>
        </>
    );
};