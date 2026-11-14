"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTelemetry } from "./store";

const cssColor = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const STATUS_VAR = { GREEN: "--color-accent", AMBER: "--color-warn", RED: "--color-crit" } as const;

/** The assistant's 3D presence: a wireframe core that takes the colour of the current status. */
export function PulsarCore() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mount.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
    camera.position.z = 4;

    const material = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.85 });
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), material);
    const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), material);
    scene.add(shell, heart);

    const paint = (status: keyof typeof STATUS_VAR) => material.color.set(cssColor(STATUS_VAR[status]));
    paint(useTelemetry.getState().telemetry.decision.status);
    const unsubscribe = useTelemetry.subscribe((s) => paint(s.telemetry.decision.status));

    const resize = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
    resize.observe(el);

    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderer.setAnimationLoop((ms) => {
        shell.rotation.set(ms / 6000, ms / 4000, 0);
        heart.rotation.set(-ms / 2500, -ms / 3000, 0);
        heart.scale.setScalar(1 + 0.12 * Math.sin(ms / 400)); // the "pulse"
        renderer.render(scene, camera);
      });
    }

    return () => {
      renderer.setAnimationLoop(null);
      resize.disconnect();
      unsubscribe();
      shell.geometry.dispose();
      heart.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mount} className="h-full min-h-56 w-full" role="img" aria-label="Núcleo de PULSAR" />;
}
