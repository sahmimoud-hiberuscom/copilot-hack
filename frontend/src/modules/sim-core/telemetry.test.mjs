import assert from "node:assert/strict";
import test from "node:test";
import { initialTelemetry, mockDecision, perclos } from "./telemetry.ts";

test("perclos is the closed fraction, 0 when empty", () => {
  assert.equal(perclos([]), 0);
  assert.equal(perclos([true, false, true, true]), 0.75);
});

test("decision escalates with the worst factor", () => {
  assert.equal(mockDecision(initialTelemetry).status, "GREEN");

  const tired = structuredClone(initialTelemetry);
  tired.selfReport.sleepHoursLast24h = 5;
  assert.equal(mockDecision(tired).escalation, "CREW");

  tired.biometrics.fatigueScore = 0.8;
  const d = mockDecision(tired);
  assert.equal(d.escalation, "FLIGHT_SURGEON");
  assert.equal(d.factors.length, 2);
});
