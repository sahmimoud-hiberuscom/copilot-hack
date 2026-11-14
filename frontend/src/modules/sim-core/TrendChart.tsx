"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import { useTelemetry } from "./store";

const WINDOW = 120; // seconds shown

/** Rolling fatigue score, one point per second. */
export function TrendChart() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const chart = echarts.init(el.current!);
    const points: [number, number][] = [];

    chart.setOption({
      animation: false,
      grid: { left: 36, right: 12, top: 12, bottom: 24 },
      tooltip: { trigger: "axis", valueFormatter: (v: number) => v.toFixed(2) },
      xAxis: { type: "time", axisLine: { lineStyle: { color: css("--color-line") } }, axisLabel: { color: css("--color-muted"), hideOverlap: true }, splitLine: { show: false } },
      yAxis: { min: 0, max: 1, axisLabel: { color: css("--color-muted") }, splitLine: { lineStyle: { color: css("--color-line") } } },
      series: [
        {
          type: "line",
          showSymbol: false,
          lineStyle: { color: css("--color-accent"), width: 2 },
          areaStyle: { color: css("--color-accent"), opacity: 0.12 },
          markLine: {
            silent: true,
            symbol: "none",
            label: { color: css("--color-muted"), formatter: "alerta", position: "insideEndTop" },
            lineStyle: { color: css("--color-crit"), type: "dashed" },
            data: [{ yAxis: 0.7 }],
          },
          data: points,
        },
      ],
    });

    const tick = setInterval(() => {
      points.push([Date.now(), useTelemetry.getState().telemetry.biometrics.fatigueScore]);
      if (points.length > WINDOW) points.shift();
      chart.setOption({ series: [{ data: points }] });
    }, 1000);
    const resize = new ResizeObserver(() => chart.resize());
    resize.observe(el.current!);

    return () => {
      clearInterval(tick);
      resize.disconnect();
      chart.dispose();
    };
  }, []);

  return (
    <section className="hud-panel">
      <h2 className="hud-title">Tendencia de fatiga · últimos 2 min</h2>
      <div ref={el} className="h-44 w-full" role="img" aria-label="Gráfica de la puntuación de fatiga en los últimos dos minutos" />
    </section>
  );
}
