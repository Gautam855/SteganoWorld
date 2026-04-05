"use client";
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';

function OrbitingParticles() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.1;
      groupRef.current.rotation.z = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 40 }).map((_, i) => {
        const radius = 3 + Math.random() * 4;
        const angle = (i / 40) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 4;
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} />
          </mesh>
        );
      })}
    </group>
  );
}

function SecurityCore() {
  const wireframeRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (wireframeRef.current) {
      wireframeRef.current.rotation.x = clock.getElapsedTime() * 0.3;
      wireframeRef.current.rotation.y = clock.getElapsedTime() * 0.4;
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={0.5} floatIntensity={1.5}>
      {/* Outer Shield (Wireframe) */}
      <mesh ref={wireframeRef}>
        <icosahedronGeometry args={[2.8, 1]} />
        <meshStandardMaterial 
          color="#38bdf8" 
          wireframe={true} 
          emissive="#0ea5e9"
          emissiveIntensity={0.4}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Inner Data Core (Distorted Liquid Metal) */}
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshDistortMaterial 
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.5}
          distort={0.4}
          speed={3}
          roughness={0.1}
          metalness={1}
        />
      </mesh>
      
      {/* Orbiting particles representing bits */}
      <OrbitingParticles />
    </Float>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 z-0 opacity-60 pointer-events-none mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={1} color="#10b981" />
        
        <SecurityCore />
        <Stars radius={50} depth={50} count={3000} factor={3} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  );
}
