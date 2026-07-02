<script setup lang="ts">
import {
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
import { Line } from "vue-chartjs";
import type { WeightEntry } from "~/types/nutrition";
import { addDaysIso, todayIso } from "~/utils/dates";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineController, LineElement, Filler, Title, Tooltip, Legend);

const props = defineProps<{
  weights: WeightEntry[];
  goalWeight: number;
  selectedDate?: string;
}>();

const chartData = computed(() => {
  const dates = Array.from({ length: 7 }, (_, index) => addDaysIso(props.selectedDate ?? todayIso(), index - 6));
  const weightsByDate = new Map(props.weights.map((row) => [row.date, row.weight]));
  const targetLow = props.goalWeight - 2;
  const targetHigh = props.goalWeight + 2;
  return {
    labels: dates.map((date) => date.slice(5)),
    datasets: [
      {
        label: "Target range low",
        data: dates.map(() => targetLow),
        borderColor: "rgba(255, 204, 0, 0)",
        backgroundColor: "rgba(255, 204, 0, 0)",
        pointRadius: 0,
        borderWidth: 0,
        fill: false,
      },
      {
        label: "Target range",
        data: dates.map(() => targetHigh),
        borderColor: "rgba(255, 204, 0, 0)",
        backgroundColor: "rgba(255, 204, 0, 0.24)",
        pointRadius: 0,
        borderWidth: 0,
        fill: "-1",
      },
      {
        label: "Goal",
        data: dates.map(() => props.goalWeight),
        borderColor: "#ffcc00",
        borderDash: [2, 5],
        borderWidth: 3,
        borderCapStyle: "round" as const,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "Weight",
        data: dates.map((date) => weightsByDate.get(date) ?? null),
        borderColor: "#446b9e",
        backgroundColor: "rgba(68, 107, 158, 0.15)",
        tension: 0.25,
        fill: false,
        spanGaps: false,
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
