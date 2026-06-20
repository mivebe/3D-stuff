import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { OrbitControls } from '@react-three/drei'
import Phone from './Phone.jsx'
import Lighting from './Lighting.jsx'
import { POSE, POSE_MOBILE, ORBIT, START_QUAT, SETTLE_QUAT } from './config.js'

// runs the scripted intro once on mount, animating the phone from a lively
// tilt into its parked hero pose, then stepping the UI phases via onPhase
export default function Experience({ finish, phase, onPhase, mobile }) {
  const phoneRef = useRef()

  const settlePosition = mobile ? POSE_MOBILE.settlePosition : POSE.settlePosition
  const settleScale = mobile ? POSE_MOBILE.settleScale : POSE.settleScale
  // orbit pivots the point the camera already looks at (world origin), so
  // enabling controls hands over with no jump. targeting the parked phone
  // instead would snap it to screen center the instant orbit turns on.
  const orbitTarget = ORBIT.target

  useGSAP(
    () => {
      const phone = phoneRef.current
      if (!phone) return

      phone.quaternion.copy(START_QUAT)
      gsap.set(phone.position, {
        x: POSE.startPosition[0],
        y: POSE.startPosition[1],
        z: POSE.startPosition[2],
      })
      gsap.set(phone.scale, {
        x: POSE.startScale,
        y: POSE.startScale,
        z: POSE.startScale,
      })

      const spin = { t: 0 }
      const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } })

      tl.to(spin, {
        t: 1,
        duration: 2.4,
        onUpdate: () => phone.quaternion.slerpQuaternions(START_QUAT, SETTLE_QUAT, spin.t),
      })
        .to(
          phone.position,
          { x: settlePosition[0], y: settlePosition[1], z: settlePosition[2], duration: 2.4 },
          '<',
        )
        .to(
          phone.scale,
          { x: settleScale, y: settleScale, z: settleScale, duration: 2.4 },
          '<',
        )
        // fake load -> skeleton, then real content fills the glass
        .call(() => onPhase(1), null, '>-0.2')
        .call(() => onPhase(2), null, '+=1.3')
        // copy fills the freed space, settle a beat, then hand over to the user
        .call(() => onPhase(3), null, '+=0.45')
        .call(() => onPhase(4), null, '+=0.5')
        .call(() => onPhase(5), null, '+=0.4')
    },
    { dependencies: [mobile], scope: phoneRef },
  )

  return (
    <>
      <Lighting />
      <Phone ref={phoneRef} finish={finish} phase={phase} />
      <OrbitControls
        enabled={phase >= 5}
        enablePan={false}
        enableZoom={false}
        target={orbitTarget}
        minAzimuthAngle={ORBIT.minAzimuth}
        maxAzimuthAngle={ORBIT.maxAzimuth}
        minPolarAngle={ORBIT.minPolar}
        maxPolarAngle={ORBIT.maxPolar}
        rotateSpeed={ORBIT.rotateSpeed}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  )
}
