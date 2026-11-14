import { create } from "zustand";
import { initialTelemetry, mockDecision, type Telemetry } from "./telemetry";

type Section = "biometrics" | "selfReport" | "environment" | "voice";

interface TelemetryStore {
  telemetry: Telemetry;
  /** Merge a partial update into one section of the contract and recompute the decision. */
  patch: <S extends Section>(section: S, values: Partial<Telemetry[S]>) => void;
}

export const useTelemetry = create<TelemetryStore>((set) => ({
  telemetry: initialTelemetry,
  patch: (section, values) =>
    set(({ telemetry }) => {
      const next = { ...telemetry, timestamp: Math.floor(Date.now() / 1000), [section]: { ...telemetry[section], ...values } };
      return { telemetry: { ...next, decision: mockDecision(next) } };
    }),
}));
