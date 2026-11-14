"use client";

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import { useTelemetry } from "../sim-core/store";
import { perclos } from "../sim-core/telemetry";

// shortcut: the model is fetched from Google on first use. For the offline demo,
// save it as public/mediapipe/face_landmarker.task and point MODEL_URL at "/mediapipe/face_landmarker.task".
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WINDOW_MS = 60_000; // PERCLOS window, as in the training features
const EYE_CLOSED = 0.5; // blendshape score above which the eye counts as closed

/** Webcam face tracking. Video never leaves the browser; only the derived numbers reach the store. */
export function FaceMonitor() {
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "tracking" | "no-face" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!on) return;
    let stopped = false;
    let frame = 0;
    let stream: MediaStream | undefined;
    let landmarker: FaceLandmarker | undefined;
    const samples: { t: number; closed: boolean }[] = [];
    const { patch } = useTelemetry.getState();

    (async () => {
      setState("loading");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        const wasm = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        landmarker = await FaceLandmarker.createFromOptions(wasm, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          outputFaceBlendshapes: true,
        });
        if (stopped) return;
        video.current!.srcObject = stream;
        await video.current!.play();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
        return;
      }

      let lastPatch = 0;
      // shortcut: runs on the main thread; move to a Web Worker (plan, FS1) if the HUD drops below 15 fps.
      const loop = () => {
        if (stopped) return;
        const now = performance.now();
        const shapes = landmarker!.detectForVideo(video.current!, now).faceBlendshapes?.[0]?.categories;
        if (shapes) {
          const score = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
          samples.push({ t: now, closed: (score("eyeBlinkLeft") + score("eyeBlinkRight")) / 2 > EYE_CLOSED });
          while (samples[0].t < now - WINDOW_MS) samples.shift();
        }
        if (now - lastPatch > 500) {
          lastPatch = now;
          setState(shapes ? "tracking" : "no-face");
          const p = perclos(samples.map((s) => s.closed));
          // shortcut: fatigue is PERCLOS rescaled (0.4 closed = 1.0) until data/fatigue_model.json exists (goal G2).
          patch("biometrics", { perclos: p, fatigueScore: Math.min(1, p / 0.4) });
        }
        frame = requestAnimationFrame(loop);
      };
      loop();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      setState("idle");
    };
  }, [on]);

  const message = {
    idle: "Cámara apagada",
    loading: "Cargando modelo…",
    tracking: "Rostro detectado",
    "no-face": "No se detecta ningún rostro",
    error: `No se pudo iniciar: ${error}`,
  }[state];

  return (
    <section className="hud-panel">
      <h2 className="hud-title">Visión biométrica</h2>
      <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-raised">
        <video ref={video} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
      </div>
      <p className="hud-label mt-2" role="status">
        {message}
      </p>
      <button className={`hud-btn mt-3 w-full ${on ? "hud-btn-ghost" : ""}`} onClick={() => setOn(!on)}>
        {on ? "Apagar cámara" : "Activar cámara"}
      </button>
    </section>
  );
}
