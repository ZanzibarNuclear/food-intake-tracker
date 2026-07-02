<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Chart } from "vue-chartjs";
import type { DailySummary } from "~/types/nutrition";
import { addDaysIso } from "~/utils/dates";

ChartJS.register(
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineController,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const props = defineProps<{
  summaries: DailySummary[];
  selectedDate: string;
  calorieTarget: number;
}>();

const chartData = computed(() => {
  const labels: string[] = [];
  const values: number[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addDaysIso(props.selectedDate, -offset);
    labels.push(date.slice(5));
    const summary = props.summaries.find((row) => row.date === date);
    values.push(summary?.calories ?? 0);
  }
  return {
    labels,
    datasets: [
      {
        label: "Calories",
        data: values,
        backgroundColor: "rgba(47, 111, 94, 0.75)",
        borderRadius: 6,
      },
      {
        label: "Target",
        data: labels.map(() => props.calorieTarget),
        type: "line" as const,
        borderColor: "#ffcc00",
        borderDash: [2, 5],
        borderWidth: 3,
        borderCapStyle: "round" as const,
        pointRadius: 0,
        fill: false,
      },
    ],
  };
});

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: "#dfe4d9" } },
    x: { grid: { display: false } },
  },
};
</script>

<template>
  <div class="chart-wrap">
    <Chart type="bar" :data="chartData" :options="options" />
  </div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 220px;
  overflow: hidden;
}

.chart-wrap :deep(canvas) {
  width: 100% !important;
  max-width: 100% !important;
}
</style>
