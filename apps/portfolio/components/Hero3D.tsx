"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Float } from "@react-three/drei";
import * as THREE from "three";

function ParticleField({ isMobile }: { isMobile: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const count = isMobile ? 300 : 1000;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      const radius = 3 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }

    return positions;
  }, [isMobile]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
    }
  });

  return (
    <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#d4a574"
        size={0.015}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

function FloatingGeometry() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.15;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshBasicMaterial
          color="#d4a574"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>
    </Float>
  );
}

function InnerParticles({ isMobile }: { isMobile: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const count = isMobile ? 80 : 300;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      const radius = Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }

    return positions;
  }, [isMobile]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = -state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#8a7a6a"
        size={0.025}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.7}
      />
    </Points>
  );
}

export default function Hero3D() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <ParticleField isMobile={isMobile} />
        <FloatingGeometry />
        <InnerParticles isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
