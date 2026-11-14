"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FaceMonitor } from "../vision-hud/FaceMonitor";
import { JurySliders } from "./JurySliders";
import { PulsarCore } from "./PulsarCore";
import { useTelemetry } from "./store";
import { TrendChart } from "./TrendChart";

const ESCALATION = { SELF_CARE: "Autocuidado", CREW: "Avisar a la tripulación", FLIGHT_SURGEON: "Contactar con el flight surgeon" };
const STATUS = { GREEN: "Verde", AMBER: "Ámbar", RED: "Rojo" };

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="hud-value">{value}</div>
      <div className="hud-label mt-1">{label}</div>
    </div>
  );
}

export function Hud() {
  const { biometrics, decision } = useTelemetry((s) => s.telemetry);

  return (
    <motion.main
      className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[18rem_1fr_20rem]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <header className="flex items-center justify-between lg:col-span-3">
        <h1 className="font-mono text-lg tracking-[0.3em] text-accent">PULSAR</h1>
        <span className="hud-status" data-status={decision.status}>
          {STATUS[decision.status].toUpperCase()}
        </span>
      </header>

      <div className="space-y-4">
        <FaceMonitor />
        <JurySliders />
      </div>

      <div className="flex flex-col gap-4">
        <section className="hud-panel flex flex-1 flex-col">
          <h2 className="hud-title">Asistente</h2>
          <div className="flex-1">
            <PulsarCore />
          </div>
          <p className="text-center text-sm" aria-live="polite">
            {ESCALATION[decision.escalation]}
          </p>
        </section>
        <TrendChart />
      </div>

      <div className="space-y-4">
        <section className="hud-panel grid grid-cols-2 gap-4">
          <h2 className="hud-title col-span-2 mb-0">Biometría</h2>
          <Readout label="Fatiga (0-1)" value={biometrics.fatigueScore.toFixed(2)} />
          <Readout label="PERCLOS" value={`${Math.round(biometrics.perclos * 100)} %`} />
          <Readout label="Pulso (lpm)" value={biometrics.heartRateBpm?.toString() ?? "—"} />
          <Readout label="PVT medio (ms)" value={biometrics.lastPvtMeanMs?.toString() ?? "—"} />
        </section>

        <section className="hud-panel">
          <h2 className="hud-title">Por qué este estado</h2>
          <ul className="space-y-2 text-sm">
            <AnimatePresence initial={false}>
              {decision.factors.map((f) => (
                <motion.li key={f} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="rounded-md bg-raised px-3 py-2">
                  {f}
                </motion.li>
              ))}
            </AnimatePresence>
            {decision.factors.length === 0 && <li className="hud-label">Todos los indicadores están dentro de rango.</li>}
          </ul>
          {decision.hrpRisk && <p className="hud-label mt-3">Riesgo HRP: {decision.hrpRisk}</p>}
        </section>
      </div>
    </motion.main>
  );
}
