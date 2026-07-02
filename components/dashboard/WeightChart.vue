<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "vue-chartjs";
import type { WeightEntry } from "~/types/nutrition";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);

const props = defineProps<{
  weights: WeightEntry[];
  goalWeight: number;
}>();

const chartData = computed(() => {
  const sorted = [...props.weights].sort((a, b) => a.date.localeCompare(b.date));
  const targetLow = props.goalWeight - 2;
  const targetHigh = props.goalWeight + 2;
  return {
    labels: sorted.map((row) => row.date.slice(5)),
    datasets: [
      {
        label: "Target range low",
        data: sorted.map(() => targetLow),
        borderColor: "rgba(255, 204, 0, 0)",
        backgroundColor: "rgba(255, 204, 0, 0)",
        pointRadius: 0,
        borderWidth: 0,
        fill: false,
      },
      {
        label: "Target range",
        data: sorted.map(() => targetHigh),
        borderColor: "rgba(255, 204, 0, 0)",
        backgroundColor: "rgba(255, 204, 0, 0.24)",
        pointRadius: 0,
        borderWidth: 0,
        fill: "-1",
      },
      {
        label: "Goal",
        data: sorted.map(() => props.goalWeight),
        borderColor: "#ffcc00",
        borderDash: [2, 5],
        borderWidth: 3,
        borderCapStyle: "round" as const,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "Weight",
        data: sorted.map((row) => row.weight),
        borderColor: "#446b9e",
        backgroundColor: "rgba(68, 107, 158, 0.15)",
        tension: 0.25,
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
    y: { grid: { color: "#dfe4d9" } },
    x: { grid: { display: false } },
  },
};
</script>

<template>
  <div class="chart-wrap">
    <Line v-if="weights.length" :data="chartData" :options="options" />
    <p v-else class="muted">Log weight to see trend.</p>
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

.muted {
  color: var(--muted);
  margin: 0;
}
</style>
