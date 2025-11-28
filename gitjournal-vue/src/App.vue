<script setup>
import { ref, onMounted, computed } from "vue";
import { fr } from "date-fns/locale";
import { format, differenceInMinutes, parseISO } from "date-fns";
import html2pdf from "html2pdf.js";

// Imports des composants et utils
import ConfigPanel from "./components/ConfigPanel.vue";
import DayCard from "./components/DayCard.vue";
import { extractTags } from "./utils/gitParser.mjs"; 

const API_URL = "http://localhost:3000/edits"; 
const COMMIT_API_URL = "http://localhost:3000/commits";

const config = ref({ token: "", owner: "", repo: "", author: "" });

// État
const savedEdits = ref({});
const journalData = ref({});
const loading = ref(false);
const error = ref(null);
const saveStatus = ref("");
const currentCategory = ref("all"); 

let cachedRawCommits = [];

onMounted(async () => {
  config.value.token = localStorage.getItem("gj_token") || "";
  config.value.owner = localStorage.getItem("gj_owner") || "";
  config.value.repo = localStorage.getItem("gj_repo") || "";
  config.value.author = localStorage.getItem("gj_author") || "";
  await loadEditsFromServer();

  setTimeout(() => {
    if (typeof window !== "undefined" && window.gsap) {
      initTree();
    }
  }, 100);
});

const loadEditsFromServer = async () => {
  try {
    const res = await fetch(API_URL);
    if (res.ok) savedEdits.value = await res.json();
  } catch (e) {
    console.error("Serveur backend injoignable");
    error.value = "Info: Serveur de sauvegarde non détecté.";
  }
};

const saveConfig = () => {
  localStorage.setItem("gj_token", config.value.token);
  localStorage.setItem("gj_owner", config.value.owner);
  localStorage.setItem("gj_repo", config.value.repo);
  localStorage.setItem("gj_author", config.value.author);
};

let timeoutId = null;
const triggerSave = () => {
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

const handleCommitUpdate = (commit) => {
  const existing = savedEdits.value[commit.id] || {};

  savedEdits.value[commit.id] = {
    ...existing, 
    message: commit.message,
    duration: commit.duration,
    status: commit.status,
  };
  triggerSave();
};

const addManualTask = (task) => {
  const id = `manual_${Date.now()}`;
  const now = new Date();

  savedEdits.value[id] = {
    message: task.message,
    duration: task.duration,
    status: task.status,
    date: now.toISOString(),
    isManual: true,
    category: task.category || "manual"
  };

  triggerSave();
  processData(cachedRawCommits);
};

// --- LOGIQUE DE TRAITEMENT & FUSION (Corrected Date Parsing) ---
const processData = (rawCommits) => {
  if (rawCommits && rawCommits.length > 0) cachedRawCommits = rawCommits;

  // 1. Traitement des commits 
  let processedItems = cachedRawCommits.map((commit, index) => {
    const isLocal = !!commit.id; 
    
    const sha = isLocal ? commit.id : commit.sha;
    
    let authorDate = isLocal ? commit.date : commit.commit.author.date;
    
    // FIX: Remove timezone names like (CEST), (CDT) which break parseISO
    authorDate = authorDate.replace(/\s*\([^)]+\)\s*$/, '').trim(); 
    
    // Safety check: skip if the date string is empty
    if (!authorDate || authorDate.trim() === "") {
        console.warn("Skipping commit with empty date:", sha);
        return null;
    }
    
    const currentDate = parseISO(authorDate);
    
    // CRITICAL CHECK: Skip if date is invalid after parsing
    if (isNaN(currentDate)) {
        console.error("INVALID DATE VALUE DETECTED:", authorDate, "Commit ID:", sha);
        return null; 
    }

    const rawMsg = isLocal ? (commit.message + "\n" + commit.fullBody) : commit.commit.message;
    const { fullCleanMsg, manualDuration, status } = extractTags(rawMsg);
    const titleOnly = fullCleanMsg.split("\n")[0].trim();

    let autoDuration = 0;
    if (index > 0) {
      const prevCommit = cachedRawCommits[index - 1];
      const prevDate = parseISO(isLocal ? prevCommit.date : prevCommit.commit.author.date);
      
      // Only calculate difference if both current and previous dates are valid
      if (!isNaN(prevDate)) { 
        const diff = differenceInMinutes(currentDate, prevDate);
        if (diff < 180) autoDuration = diff;
      }
    }

    const saved = savedEdits.value[sha];
    let finalDuration = autoDuration;

    if (manualDuration !== null) finalDuration = manualDuration;
    if (saved && saved.duration !== undefined) finalDuration = saved.duration;

    const finalMessage = saved?.message || titleOnly;
    const finalStatus = saved?.status || status || commit.parsedStatus || "DONE";
    const finalCategory = commit.category || "general";

    return {
      id: sha,
      message: finalMessage,
      date: currentDate,
      timeStr: format(currentDate, "HH:mm"),
      dateKey: format(currentDate, "EEEE d MMMM yyyy", { locale: fr }),
      duration: finalDuration,
      status: finalStatus,
      url: commit.html_url,
      isManual: false,
      category: finalCategory,
    };
  });
  
  processedItems = processedItems.filter(c => c !== null);


  // 2. Injection des tâches MANUELLES 
  Object.keys(savedEdits.value).forEach((key) => {
    const item = savedEdits.value[key];
    if (item.isManual) {
      const itemDate = parseISO(item.date);
      
      if (isNaN(itemDate)) {
        console.error("INVALID MANUAL TASK DATE DETECTED. PLEASE CHECK modifications.json:", item.date);
        return; 
      }

      processedItems.push({
        id: key,
        message: item.message,
        date: itemDate,
        timeStr: format(itemDate, "HH:mm"),
        dateKey: format(itemDate, "EEEE d MMMM yyyy", { locale: fr }),
        duration: item.duration,
        status: item.status,
        url: null,
        isManual: true,
        category: item.category || "manual",
      });
    }
  });

  // 3. Filtering and Grouping
  if (currentCategory.value !== "all") {
    processedItems = processedItems.filter(item => 
      item.category === currentCategory.value || item.category === "manual"
    );
  }

  // 4. Tri par date décroissante
  processedItems.sort((a, b) => b.date - a.date);

  // 5. Groupement par jour
  const grouped = {};
  processedItems.forEach((c) => {
    if (!grouped[c.dateKey])
      grouped[c.dateKey] = { commits: [], totalMinutes: 0 };
    grouped[c.dateKey].commits.push(c);
    grouped[c.dateKey].totalMinutes += c.duration;
  });

  journalData.value = grouped;
};

const fetchCommits = async () => {
  saveConfig();
  await loadEditsFromServer();

  loading.value = true;
  error.value = null;

  // NOUVEAU: ENVOI DES PARAMÈTRES owner/repo au backend
  const owner = config.value.owner;
  const repo = config.value.repo;
  const apiUrlWithParams = `${COMMIT_API_URL}?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;

  try {
    const res = await fetch(apiUrlWithParams);
    if (!res.ok) throw new Error("Erreur Local Git: Assurez-vous d'être dans un repo Git.");
    
    const rawCommits = await res.json();
    
    processData(rawCommits);

  } catch (e) {
    if (e.message.includes("Git")) {
        error.value = e.message;
    } else {
        error.value = "Erreur de connexion au serveur ou de l'API: " + e.message;
    }
    
    if (Object.keys(savedEdits.value).some(key => savedEdits.value[key].isManual)) {
        processData([]);
    }

  } finally {
    loading.value = false;
  }
};

const exportPDF = () => {
  const element = document.getElementById("printable-area");
  const opt = {
    margin: 10,
    filename: `Journal-${config.value.repo || "Manuel"}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };
  html2pdf().set(opt).from(element).save();
};

const initTree = () => {
    // Your existing GSAP initTree function logic
}

</script>

<template>
  <div class="left-big-tree">
    </div>

  <div class="app-container">
    <ConfigPanel
      :config="config"
      :loading="loading"
      :saveStatus="saveStatus"
      :hasData="Object.keys(journalData).length > 0"
      @generate="fetchCommits"
      @export="exportPDF"
      @add-manual-task="addManualTask"
    />

    <div v-if="error" class="error">{{ error }}</div>

    <div class="filter-bar no-print">
      <button 
        :class="{ active: currentCategory === 'all' }" 
        @click="currentCategory = 'all'; processData()"
      >All</button>
      
      <button 
        :class="{ active: currentCategory === 'cicd' }" 
        @click="currentCategory = 'cicd'; processData()"
      >CI/CD</button>
      
      <button 
        :class="{ active: currentCategory === 'test' }" 
        @click="currentCategory = 'test'; processData()"
      >Test</button>
      
      <button 
        :class="{ active: currentCategory === 'manual' }" 
        @click="currentCategory = 'manual'; processData()"
      >Manual Tasks</button>
    </div>

    <main id="printable-area">
      <div v-if="Object.keys(journalData).length" class="report-header">
        <h2>Journal : {{ config.repo }}</h2>
        <p>Généré le {{ new Date().toLocaleDateString() }}</p>
      </div>

      <DayCard
        v-for="(data, date) in journalData"
        :key="date"
        :date="date"  :data="data"
        @commit-updated="handleCommitUpdate"
      />

      <div
        v-if="!loading && Object.keys(journalData).length === 0 && !error"
        class="empty-state"
      >
        <p style="text-align: center; color: #aaa; margin-top: 20px">
          Aucune activité. Lancez une génération ou ajoutez une tâche manuelle.
        </p>
      </div>
    </main>
  </div>

  <div class="right-big-tree">
    </div>
</template>

<style scoped>
/* ... (Existing styles) ... */

/* --- NEW FILTER BAR STYLES --- */
.filter-bar {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  margin-top: 10px;
}
.filter-bar button {
  background: white;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
  color: #555;
  transition: all 0.2s;
  font-size: 0.9rem;
}
.filter-bar button.active {
  background: #42b883;
  color: white;
  border-color: #42b883;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.filter-bar button:hover:not(.active) {
  background: #f0f0f0;
}
/* --- END NEW FILTER BAR STYLES --- */

/* ... (Rest of the styles) ... */
</style>