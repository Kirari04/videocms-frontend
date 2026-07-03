import type { ApexOptions } from "apexcharts";
import { useTheme } from "./useTheme";

/**
 * Single source of truth for chart colors and chrome.
 *
 * Categorical slots are validated (dataviz six checks) against the theme
 * surfaces in both modes — keep the order fixed, never cycle past it:
 *   slot 1 indigo (brand), slot 2 teal, slot 3 amber.
 * Status colors are reserved for state (never "series 4").
 */
export interface ChartPalette {
    series: [string, string, string];
    grid: string;
    label: string;
    surface: string;
}

const light: ChartPalette = {
    series: ["#4f46e5", "#0d9488", "#d97706"],
    grid: "rgba(28, 30, 45, 0.08)",
    label: "rgba(28, 30, 45, 0.65)",
    surface: "#fdfdff",
};

const dark: ChartPalette = {
    series: ["#6367ef", "#0d9488", "#d97706"],
    grid: "rgba(223, 225, 232, 0.08)",
    label: "rgba(223, 225, 232, 0.65)",
    surface: "#16181f",
};

export function useChartPalette() {
    const { theme } = useTheme();
    return computed<ChartPalette>(() => (theme.value === "dark" ? dark : light));
}

/**
 * Shared ApexCharts chrome: recessive solid hairline grid, muted labels,
 * no toolbar/zoom noise. Merge per-chart options on top.
 */
export function useChartBaseOptions() {
    const palette = useChartPalette();
    const { theme } = useTheme();

    return computed<ApexOptions>(() => ({
        chart: {
            animations: { enabled: false },
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: "inherit",
            background: "transparent",
        },
        colors: [...palette.value.series],
        dataLabels: { enabled: false },
        stroke: { curve: "straight", width: 2, lineCap: "round" },
        grid: {
            borderColor: palette.value.grid,
            strokeDashArray: 0,
            xaxis: { lines: { show: false } },
        },
        xaxis: {
            type: "datetime",
            tooltip: { enabled: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                datetimeUTC: false,
                style: { colors: palette.value.label, fontSize: "11px" },
                datetimeFormatter: {
                    year: "yyyy",
                    month: "MMM 'yy",
                    day: "dd MMM",
                    hour: "HH:mm",
                },
            },
        },
        yaxis: {
            labels: {
                style: { colors: palette.value.label, fontSize: "11px" },
            },
        },
        legend: {
            show: false,
            position: "top",
            horizontalAlign: "left",
            fontSize: "12px",
            labels: { colors: palette.value.label },
            markers: { size: 4, shape: "circle" as const, strokeWidth: 0 },
            itemMargin: { horizontal: 10 },
        },
        theme: { mode: theme.value === "dark" ? ("dark" as const) : ("light" as const) },
        tooltip: {
            theme: theme.value === "dark" ? "dark" : "light",
            x: { format: "dd MMM HH:mm" },
        },
    }));
}

/** Soft area fill that stays a wash, never a saturated block. */
export const areaFill: ApexOptions["fill"] = {
    type: "gradient",
    gradient: {
        shadeIntensity: 0,
        opacityFrom: 0.18,
        opacityTo: 0.02,
        stops: [0, 100],
    },
};

/** Shared time-range presets for every history chart. */
export const chartTimeRanges = [
    { label: "3H", hours: 3 },
    { label: "24H", hours: 24 },
    { label: "7D", hours: 24 * 7 },
    { label: "30D", hours: 24 * 30 },
] as const;

export type ChartTimeRange = (typeof chartTimeRanges)[number];
