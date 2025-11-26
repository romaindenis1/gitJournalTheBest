<script setup>
import { ref } from "vue";
defineProps({
  config: Object,
  loading: Boolean,
  saveStatus: String,
  hasData: Boolean,
  currentTheme: String,
});

const emit = defineEmits([
  "generate",
  "export",
  "update-theme",
  "add-manual-task",
]);

const newTask = ref({
  message: "",
  duration: 30,
  status: "DONE",
});
const triggerAddTask = () => {
  if (!newTask.value.message.trim()) return alert("Description requise");

  // On envoie une copie de l'objet
  emit("add-manual-task", { ...newTask.value });

  // On reset juste le message pour pouvoir enchainer
  newTask.value.message = "";
};
</script>

<template>
  <header class="no-print">
    <div class="title-container">
      <h1>
        <img src="/icon.png" alt="Logo" class="logo-img glow-img" />
        <span class="neon-text">GitJournal</span>
      </h1>
    </div>

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

      <div class="divider"></div>

      <div class="form-row manual-row">
        <div class="input-group flex-grow">
          <input
            v-model="newTask.message"
            type="text"
            placeholder="Ajouter une tâche hors-git..."
            class="std-input task-input"
            @keyup.enter="triggerAddTask"
          />
        </div>
        <div class="input-group small">
          <input
            v-model="newTask.duration"
            type="number"
            class="std-input"
            min="0"
            title="Minutes"
          />
          <span class="unit">min</span>
        </div>
        <div class="input-group medium">
          <select v-model="newTask.status" class="std-select">
            <option value="DONE">DONE</option>
            <option value="WIP">WIP</option>
            <option value="FIX">FIX</option>
            <option value="FEAT">FEAT</option>
          </select>
        </div>
        <button
          @click="triggerAddTask"
          class="btn-add"
          title="Ajouter la tâche"
        >
          +
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
        Exporter PDF
      </button>
    </div>
  </header>
</template>

<style scoped>
/* --- THÈME NÉON TECH (Conservé) --- */
h1 {
  font-family: "Inter", sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 3.5rem;
  font-weight: 800;
  margin: 10px 0 25px 0;
  text-transform: uppercase;
  letter-spacing: -1px;
}
.neon-text {
  color: #42b883;
  text-shadow: 0 0 2px #fff, 0 0 10px #42b883, 0 0 20px rgba(66, 184, 131, 0.5);
}
.logo-img {
  height: 60px;
  width: auto;
  margin-right: 20px;
  filter: drop-shadow(0 0 8px rgba(66, 184, 131, 0.8));
}
.config-box {
  background: white;
  padding: 25px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
  border: 1px solid #f0f0f0;
}

/* LAYOUT GENERAL */
.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-items: center;
}
.std-input,
.std-select {
  flex: 1;
  min-width: 100px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  background-color: #fff;
}
.std-input:focus,
.std-select:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

/* BOUTON GENERER */
.btn-gen {
  background: #42b883;
  color: white;
  border: none;
  padding: 0 25px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  height: 45px;
  white-space: nowrap;
}
.btn-gen:hover {
  background: #3aa876;
  transform: translateY(-1px);
}
.btn-gen:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

/* BOUTON PDF */
.btn-pdf {
  width: 100%;
  background: #2c3e50;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 15px;
  font-weight: bold;
  font-size: 1rem;
}
.btn-pdf:hover {
  background: #1a252f;
}

/* --- NOUVEAUX STYLES TACHE MANUELLE --- */
.divider {
  height: 1px;
  background: #e2e8f0;
  margin: 20px 0;
}
.manual-row {
  background: #f8fafc;
  padding: 10px;
  border-radius: 10px;
  border: 1px dashed #cbd5e1;
}
.input-group {
  position: relative;
  display: flex;
  align-items: center;
}
.flex-grow {
  flex: 2; /* Le champ texte prend plus de place */
  min-width: 200px;
}
.small {
  flex: 0 0 80px;
}
.medium {
  flex: 0 0 100px;
}
.unit {
  position: absolute;
  right: 10px;
  font-size: 0.8em;
  color: #94a3b8;
  pointer-events: none;
}
.btn-add {
  background: #42b883;
  color: white;
  border: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  font-size: 1.5em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}
.btn-add:hover {
  transform: scale(1.1);
  background: #3aa876;
}

.tips {
  text-align: center;
  color: #718096;
  margin-top: 10px;
  font-size: 0.85em;
}
.ok {
  color: #42b883;
  font-weight: bold;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    align-items: stretch;
  }
  .input-group {
    width: 100%;
  }
  .btn-gen,
  .btn-add {
    width: 100%;
    border-radius: 8px;
  }
  .btn-add {
    height: 40px;
  }
}
</style>
