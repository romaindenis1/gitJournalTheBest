<script setup>
import { ref, onMounted } from "vue";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import html2pdf from "html2pdf.js";

// --- CONFIG ---
const API_URL = "http://localhost:3000/edits"; // Adresse de notre serveur Node
const config = ref({ token: "", owner: "", repo: "", author: "" });

// --- ÉTAT ---
const savedEdits = ref({});
const journalData = ref({});
const loading = ref(false);
const error = ref(null);
const saveStatus = ref(""); // Pour afficher "Sauvegarde..."

// --- CHARGEMENT ---
onMounted(async () => {
  // Config locale (reste dans le navigateur car c'est privé)
  config.value.token = localStorage.getItem("gj_token") || "";
  config.value.owner = localStorage.getItem("gj_owner") || "";
  config.value.repo = localStorage.getItem("gj_repo") || "";
  config.value.author = localStorage.getItem("gj_author") || "";

  // Charger les edits depuis le SERVEUR
  await loadEditsFromServer();
});

const loadEditsFromServer = async () => {
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      savedEdits.value = await res.json();
    }
  } catch (e) {
    console.error("Impossible de joindre le serveur local", e);
    error.value = "Attention: Le serveur backend (port 3000) n'est pas lancé.";
  }
};

const saveConfig = () => {
  localStorage.setItem("gj_token", config.value.token);
  localStorage.setItem("gj_owner", config.value.owner);
  localStorage.setItem("gj_repo", config.value.repo);
  localStorage.setItem("gj_author", config.value.author);
};

// --- SAUVEGARDE SUR SERVEUR (Avec Debounce) ---
let timeoutId = null;

const saveEdit = (commit) => {
  // 1. Mise à jour immédiate de l'objet local (pour la réactivité UI)
  savedEdits.value[commit.id] = {
    message: commit.message,
    duration: commit.duration,
  };

  // Recalcul du total local
  updateTotal(commit.dateKey);

  // 2. Envoi au serveur (Décalé de 500ms pour ne pas spammer le serveur quand on tape)
  saveStatus.value = "...";

  clearTimeout(timeoutId);
  timeoutId = setTimeout(async () => {
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedEdits.value),
      });
      saveStatus.value = "Sauvegardé ✓";
      setTimeout(() => {
        saveStatus.value = "";
      }, 2000);
    } catch (e) {
      saveStatus.value = "Erreur Sauvegarde ❌";
    }
  }, 1000);
};

// --- LOGIQUE MÉTIER ---

const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const updateTotal = (dateKey) => {
  const day = journalData.value[dateKey];
  if (day) {
    day.totalMinutes = day.commits.reduce(
      (acc, c) => acc + (parseInt(c.duration) || 0),
      0
    );
  }
};

const fetchCommits = async () => {
  saveConfig();
  // On recharge les edits du serveur pour être sûr d'être à jour
  await loadEditsFromServer();

  if (!config.value.owner || !config.value.repo) {
    error.value = "Veuillez remplir le propriétaire et le dépôt.";
    return;
  }

  loading.value = true;
  error.value = null;
  journalData.value = {};

  try {
    let url = `https://api.github.com/repos/${config.value.owner}/${config.value.repo}/commits?per_page=100`;
    if (config.value.author) url += `&author=${config.value.author}`;
    const headers = { Accept: "application/vnd.github.v3+json" };
    if (config.value.token)
      headers["Authorization"] = `token ${config.value.token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Erreur API: ${res.status}`);

    let rawCommits = await res.json();
    rawCommits.reverse();

    const processedCommits = rawCommits.map((commit, index) => {
      const currentDate = parseISO(commit.commit.author.date);
      const sha = commit.sha;

      // Calcul par défaut
      let calculatedDuration = 0;
      if (index > 0) {
        const prevDate = parseISO(rawCommits[index - 1].commit.author.date);
        const diff = differenceInMinutes(currentDate, prevDate);
        if (diff < 180) calculatedDuration = diff;
      }

      // Fusion avec les données du SERVEUR
      const saved = savedEdits.value[sha];
      const finalMessage =
        saved?.message || commit.commit.message.split("\n")[0];
      const finalDuration =
        saved && saved.duration !== undefined
          ? saved.duration
          : calculatedDuration;

      return {
        id: sha,
        message: finalMessage,
        date: currentDate,
        timeStr: format(currentDate, "HH:mm"),
        dateKey: format(currentDate, "EEEE d MMMM yyyy", { locale: fr }),
        duration: finalDuration,
        url: commit.html_url,
      };
    });

    processedCommits.reverse();

    const grouped = {};
    processedCommits.forEach((c) => {
      if (!grouped[c.dateKey])
        grouped[c.dateKey] = { commits: [], totalMinutes: 0 };
      grouped[c.dateKey].commits.push(c);
      grouped[c.dateKey].totalMinutes += c.duration;
    });

    journalData.value = grouped;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const exportPDF = () => {
  const element = document.getElementById("printable-area");
  const opt = {
    margin: 10,
    filename: `Journal-${config.value.repo}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };
  html2pdf().set(opt).from(element).save();
};
</script>

<template>
  <div class="app-container">
    <header class="no-print">
      <h1><span class="icon">☁️</span> GitJournal Serveur</h1>

      <div class="config-box">
        <div class="form-row">
          <input
            v-model="config.token"
            type="password"
            placeholder="Token GitHub (Optionnel)"
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
          <button @click="fetchCommits" :disabled="loading" class="btn-gen">
            {{ loading ? "..." : "Générer" }}
          </button>
        </div>
        <div class="tips">
          <small
            >Status serveur :
            <span
              :class="{
                ok: saveStatus.includes('✓'),
                err: saveStatus.includes('Erreur'),
              }"
              >{{ saveStatus || "Prêt" }}</span
            ></small
          >
        </div>
        <button
          v-if="Object.keys(journalData).length"
          @click="exportPDF"
          class="btn-pdf"
        >
          Télécharger en PDF
        </button>
      </div>
      <div v-if="error" class="error">{{ error }}</div>
    </header>

    <main id="printable-area">
      <div v-if="Object.keys(journalData).length" class="report-header">
        <h2>Journal de bord : {{ config.repo }}</h2>
        <p>Généré le {{ new Date().toLocaleDateString() }}</p>
      </div>

      <div v-for="(data, date) in journalData" :key="date" class="day-card">
        <div class="day-header">
          <h3>{{ date.charAt(0).toUpperCase() + date.slice(1) }}</h3>
          <span class="daily-total"
            >Total: {{ formatDuration(data.totalMinutes) }}</span
          >
        </div>

        <div class="timeline">
          <div
            v-for="commit in data.commits"
            :key="commit.id"
            class="commit-row"
          >
            <div class="time-col">
              <div class="time">{{ commit.timeStr }}</div>
              <div class="duration-wrapper">
                <input
                  type="number"
                  v-model.number="commit.duration"
                  @input="saveEdit(commit)"
                  class="edit-duration"
                  min="0"
                />
                <span class="min-label">min</span>
              </div>
            </div>
            <div class="content-col">
              <input
                v-model="commit.message"
                @input="saveEdit(commit)"
                class="edit-message"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
:root {
  --primary: #42b883;
}
.app-container {
  font-family: "Inter", sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  color: #2c3e50;
}
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
.err {
  color: #e74c3c;
  font-weight: bold;
}
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
.commit-row {
  display: flex;
  margin-bottom: 12px;
  align-items: flex-start;
}
.time-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 15px;
  min-width: 70px;
}
.time {
  font-weight: bold;
  color: #35495e;
  font-size: 0.9em;
  margin-bottom: 2px;
}
.duration-wrapper {
  display: flex;
  align-items: center;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}
.edit-duration {
  width: 35px;
  background: transparent;
  border: none;
  text-align: right;
  font-family: inherit;
  font-size: 0.85em;
  color: #666;
  font-weight: bold;
  outline: none;
  -moz-appearance: textfield;
}
.edit-duration:focus {
  color: #42b883;
  border-bottom: 1px solid #42b883;
}
.edit-message {
  width: 100%;
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 1em;
  color: #333;
  background: transparent;
  padding: 4px;
  border-radius: 4px;
  outline: none;
  transition: all 0.2s;
}
.edit-message:hover {
  background-color: #f9f9f9;
  border-color: #eee;
}
.edit-message:focus {
  background-color: white;
  border-color: #42b883;
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.1);
}
.min-label {
  font-size: 0.7em;
  color: #888;
  margin-left: 2px;
}
.report-header {
  text-align: center;
  margin-bottom: 30px;
  display: none;
}
#printable-area .report-header {
  display: block;
}
@media print {
  .edit-message {
    border: none !important;
    resize: none;
  }
  .edit-duration {
    border: none !important;
  }
}
</style>
