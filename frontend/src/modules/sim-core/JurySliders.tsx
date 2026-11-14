"use client";

import { useTelemetry } from "./store";

function Slider(props: { label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between">
        <span className="hud-label">{props.label}</span>
        <span className="font-mono text-sm">
          {props.value} {props.unit}
        </span>
      </span>
      <input
        type="range"
        className="hud-range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Lets the jury push the environment and watch the decision change. */
export function JurySliders() {
  const env = useTelemetry((s) => s.telemetry.environment);
  const sleep = useTelemetry((s) => s.telemetry.selfReport.sleepHoursLast24h) ?? 0;
  const patch = useTelemetry((s) => s.patch);

  return (
    <section className="hud-panel space-y-3">
      <h2 className="hud-title">Simulación del entorno</h2>
      <Slider label="Radiación" unit="mSv" min={0} max={100} step={0.1} value={env.radiation_mSv} onChange={(v) => patch("environment", { radiation_mSv: v })} />
      <Slider label="CO₂ de cabina" unit="mmHg" min={0} max={10} step={0.1} value={env.cabinCo2_mmHg} onChange={(v) => patch("environment", { cabinCo2_mmHg: v })} />
      <Slider label="Sueño últimas 24 h" unit="h" min={0} max={12} step={0.5} value={sleep} onChange={(v) => patch("selfReport", { sleepHoursLast24h: v })} />
    </section>
  );
}
