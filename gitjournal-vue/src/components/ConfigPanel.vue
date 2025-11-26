<script setup>
defineProps({
  config: Object,
  loading: Boolean,
  saveStatus: String,
  hasData: Boolean,
  currentTheme: String,
});

defineEmits(["generate", "export", "update-theme"]);
</script>

<template>
  <header class="no-print">
    <h1><span class="icon">🏷️</span> GitJournal Modular</h1>
    <div class="config-box">
      <div class="form-row">
        <input
          v-model="config.token"
          type="password"
          placeholder="Token GitHub"
          class="std-input"
        />
        <input
          v-model="config.author"
          type="text"
          placeholder="Filtre Auteur"
          class="std-input"
        />
      </div>
      <div class="form-row">
        <input
          v-model="config.owner"
          type="text"
          placeholder="User/Org"
          class="std-input"
        />
        <input
          v-model="config.repo"
          type="text"
          placeholder="Repo"
          class="std-input"
        />
        <button @click="$emit('generate')" :disabled="loading" class="btn-gen">
          {{ loading ? "..." : "Générer" }}
        </button>
      </div>
      <div class="tips">
        <small
          >Status:
          <span :class="{ ok: saveStatus.includes('✓') }">{{
            saveStatus || "Prêt"
          }}</span></small
        >
      </div>
      <button v-if="hasData" @click="$emit('export')" class="btn-pdf">
        PDF
      </button>
    </div>
  </header>
</template>

<style scoped>
.config-box {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
}
.std-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}
.form-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.btn-gen {
  background: #42b883;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 6px;
  cursor: pointer;
}
.btn-pdf {
  width: 100%;
  background: #35495e;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}
.tips {
  text-align: center;
  color: #666;
  margin-top: 5px;
  font-size: 0.9em;
  height: 20px;
}
.ok {
  color: #42b883;
  font-weight: bold;
}
h1 {
  text-align: center;
  margin-bottom: 20px;
}
</style>
