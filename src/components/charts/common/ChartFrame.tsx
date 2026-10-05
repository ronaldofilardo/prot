import React from "react";
import ReactECharts from "echarts-for-react";

interface ChartFrameProps {
  option: object;
  vazio: string;
}

export function ChartFrame({ option, vazio }: ChartFrameProps) {
  if (Object.keys(option).length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        {vazio}
      </div>
    );
  }
  return (
    <div style={{ height: "280px", width: "100%" }}>
      <ReactECharts
        option={option}
        notMerge={true}
        lazyUpdate={true}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
