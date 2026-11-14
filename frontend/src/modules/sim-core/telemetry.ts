// Mirrors shared/telemetry.schema.json. Pure types and logic: no imports, so node can test it directly.

export type Status = "GREEN" | "AMBER" | "RED";

export interface Telemetry {
  schemaVersion: "1.0";
  timestamp: number;
  biometrics: {
    heartRateBpm: number | null;
    heartRateConfidence: number;
    fatigueScore: number;
    perclos: number;
    yawnsPerMin: number;
    postureStability: number;
    armAsymmetry: number;
    lastPvtMeanMs: number | null;
    lastPvtLapses: number | null;
  };
  selfReport: {
    sleepHoursLast24h: number | null;
    mood: number | null;
    bloodPressure: string | null;
    glucoseMgDl: number | null;
    bodyTempC: number | null;
  };
  environment: {
    radiation_mSv: number;
    cabinCo2_mmHg: number;
    gravityMode: "MICROGRAVITY" | "MOON_016G" | "MARS_038G";
    activeHazards: ("RADIATION" | "ISOLATION" | "DISTANCE" | "GRAVITY" | "ENVIRONMENT")[];
  };
  decision: {
    status: Status;
    escalation: "SELF_CARE" | "CREW" | "FLIGHT_SURGEON";
    affectedSystems: string[];
    hrpRisk: string | null;
    factors: string[];
    countermeasureId: string | null;
  };
  voice: {
    handsFreeMode: boolean;
    isListening: boolean;
    transcript: string;
    responseText: string;
    audioUrl: string;
  };
}

export const initialTelemetry: Telemetry = {
  schemaVersion: "1.0",
  timestamp: 0,
  biometrics: {
    heartRateBpm: null,
    heartRateConfidence: 0,
    fatigueScore: 0,
    perclos: 0,
    yawnsPerMin: 0,
    postureStability: 1,
    armAsymmetry: 0,
    lastPvtMeanMs: null,
    lastPvtLapses: null,
  },
  selfReport: { sleepHoursLast24h: 7, mood: null, bloodPressure: null, glucoseMgDl: null, bodyTempC: null },
  environment: { radiation_mSv: 0.8, cabinCo2_mmHg: 2.9, gravityMode: "MARS_038G", activeHazards: ["DISTANCE", "GRAVITY"] },
  decision: { status: "GREEN", escalation: "SELF_CARE", affectedSystems: [], hrpRisk: null, factors: [], countermeasureId: null },
  voice: { handsFreeMode: false, isListening: false, transcript: "", responseText: "", audioUrl: "" },
};

/** Fraction of samples with eyes closed. `closed` is one boolean per video frame in the window. */
export function perclos(closed: boolean[]): number {
  return closed.length ? closed.filter(Boolean).length / closed.length : 0;
}

// shortcut: placeholder thresholds so the HUD reacts before the backend exists.
// Replace with the response of backend/routers/rules_engine.py (goal G4); none of these numbers is clinically sourced yet.
export function mockDecision(t: Pick<Telemetry, "biometrics" | "selfReport" | "environment">): Telemetry["decision"] {
  const red: string[] = [];
  const amber: string[] = [];
  const { fatigueScore } = t.biometrics;
  const sleep = t.selfReport.sleepHoursLast24h;
  const { cabinCo2_mmHg: co2, radiation_mSv: rad } = t.environment;

  if (fatigueScore >= 0.7) red.push("Fatiga ocular alta");
  else if (fatigueScore >= 0.4) amber.push("Fatiga ocular moderada");
  if (sleep !== null && sleep < 6) amber.push("Menos de 6 h de sueño");
  if (co2 >= 6) red.push("CO₂ de cabina muy alto");
  else if (co2 >= 4) amber.push("CO₂ de cabina elevado");
  if (rad >= 50) red.push("Dosis de radiación muy alta");
  else if (rad >= 10) amber.push("Dosis de radiación elevada");

  const status: Status = red.length ? "RED" : amber.length ? "AMBER" : "GREEN";
  const sleepRelated = fatigueScore >= 0.4 || (sleep !== null && sleep < 6);
  return {
    status,
    escalation: status === "RED" ? "FLIGHT_SURGEON" : status === "AMBER" ? "CREW" : "SELF_CARE",
    affectedSystems: sleepRelated ? ["NEURO"] : [],
    hrpRisk: sleepRelated ? "Risk of Inadequate Sleep and Irregular Schedules" : null,
    factors: [...red, ...amber],
    countermeasureId: null,
  };
}
