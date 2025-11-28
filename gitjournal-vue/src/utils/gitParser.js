// src/utils/gitParser.js
import { format } from "date-fns";

export const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const parseDurationStr = (str) => {
  if (!str) return 0;
  const s = str.toLowerCase().trim();

  // Cas simple : juste des chiffres
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  let total = 0;
  const hMatch = s.match(/(\d+)h/);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;

  const mMatch = s.match(/(\d+)m?$/);
  if (mMatch) {
    const isSameAsHour = hMatch && s.endsWith("h");
    if (!isSameAsHour) {
      let minutePart = s.split("h")[1] || s;
      minutePart = minutePart.replace("m", "");
      if (minutePart && /^\d+$/.test(minutePart)) {
        total += parseInt(minutePart, 10);
      }
    }
  }
  return total;
};

export const extractTags = (originalMsg) => {
  let cleanMsg = originalMsg;
  let manualDuration = null;
  let status = null;

  // 1. Statut
  const statusRegex = /\[(DONE|WIP|FIX|FEATURE)\]/i;
  const statusMatch = cleanMsg.match(statusRegex);
  if (statusMatch) {
    status = statusMatch[1].toUpperCase();
    cleanMsg = cleanMsg.replace(statusMatch[0], "");
  }

  // 2. Durée
  const timeRegex = /\[(\d+(?:h|m)?(?:\d+m?)?)\]/i;
  const timeMatch = cleanMsg.match(timeRegex);
  if (timeMatch) {
    manualDuration = parseDurationStr(timeMatch[1]);
    cleanMsg = cleanMsg.replace(timeMatch[0], "");
  }

  return {
    fullCleanMsg: cleanMsg.trim(),
    manualDuration,
    status,
  };
};
