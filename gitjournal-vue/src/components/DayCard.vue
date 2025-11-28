<script setup>
import { computed } from "vue";
import CommitRow from "./CommitRow.vue";
import { formatDuration } from "../utils/gitParser";

const props = defineProps({
  date: String,
  data: Object,
});

const emit = defineEmits(["commit-updated"]);

// Recalcul dynamique du total pour l'affichage
const dayTotal = computed(() => {
  return props.data.commits.reduce(
    (acc, c) => acc + (parseInt(c.duration) || 0),
    0
  );
});

const onCommitUpdate = (commit) => {
  // On signale au parent qu'un commit a changé pour qu'il sauvegarde
  emit("commit-updated", commit);
};
</script>

<template>
  <div class="day-card">
    <div class="day-header">
      <h3>{{ date.charAt(0).toUpperCase() + date.slice(1) }}</h3>
      <span class="daily-total">Total: {{ formatDuration(dayTotal) }}</span>
    </div>

    <div class="timeline">
      <CommitRow
        v-for="commit in data.commits"
        :key="commit.id"
        :commit="commit"
        @update="onCommitUpdate(commit)"
      />
    </div>
  </div>
</template>

<style scoped>
.day-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #eee;
  page-break-inside: avoid;
}
.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.day-header h3 {
  margin: 0;
  color: #35495e;
  font-size: 1.2em;
}
.daily-total {
  background: #eefbf4;
  color: #42b883;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9em;
}
</style>
