import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "./App.vue";
import html2pdf from "html2pdf.js";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// --- MOCKS ---
vi.mock("html2pdf.js", () => ({
  default: vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    save: vi.fn(),
  })),
}));

global.fetch = vi.fn();

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("App.vue - GitJournal Integration", () => {
  let wrapper;

  // Jeu de données pour tester le parsing des tags
  const mockCommitsTags = [
    {
      sha: "tag2",
      commit: {
        // [DONE][30] devrait forcer la durée à 30min, même si la diff est différente
        message: "[DONE][30] Tâche terminée\nDescription",
        author: { date: "2023-10-10T10:00:00Z" },
      },
      html_url: "url2",
    },
    {
      sha: "tag1",
      commit: {
        message: "Début projet",
        author: { date: "2023-10-10T09:00:00Z" },
      },
      html_url: "url1",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  it("priorise le tag manuel [30] sur le calcul automatique", async () => {
    // Mock implémentation intelligente
    fetch.mockImplementation((url) => {
      if (url.toString().includes("github.com")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCommitsTags),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    wrapper = mount(App);
    await flushPromises();

    wrapper.vm.config.owner = "user";
    wrapper.vm.config.repo = "repo";
    await wrapper.find(".btn-gen").trigger("click");

    await flushPromises();
    await wrapper.vm.$nextTick();

    const rows = wrapper.findAll(".commit-row");
    expect(rows.length).toBe(2);

    // TEST DE LA DURÉE
    // Calcul auto : 10h - 9h = 60min.
    // MAIS le tag est [30]. Donc on attend 30.
    const durationInput = rows[0].find(".edit-duration").element.value;
    expect(durationInput).toBe("30");

    // TEST DU MESSAGE NETTOYÉ
    // Le message affiché ne doit plus contenir [DONE][30]
    const messageInput = rows[0].find(".edit-message").element.value;
    expect(messageInput).toBe("Tâche terminée");

    // TEST DU STATUT
    // On vérifie qu'un badge DONE est apparu
    const badge = rows[0].find(".status-badge.DONE");
    expect(badge.exists()).toBe(true);
  });

  // Test de sauvegarde (inchangé, mais inclus pour complétude)
  it("sauvegarde les modifications avec debounce", async () => {
    vi.useFakeTimers();
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    wrapper = mount(App);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    wrapper.vm.journalData = {
      keyDay: {
        commits: [
          { id: "123", message: "Original", duration: 10, dateKey: "keyDay" },
        ],
        totalMinutes: 10,
      },
    };
    await wrapper.vm.$nextTick();

    const inputMsg = wrapper.find(".edit-message");
    await inputMsg.setValue("Modif");
    await wrapper.vm.$nextTick();

    vi.advanceTimersByTime(1100);

    const calls = fetch.mock.calls;
    const postCall = calls.find((call) => call[1] && call[1].method === "POST");
    expect(postCall).toBeDefined();
    vi.useRealTimers();
  });

  it("priorise le tag manuel [30] sur le calcul automatique", async () => {
    // Mock implémentation intelligente
    fetch.mockImplementation((url) => {
      if (url.toString().includes("github.com")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCommitsTags),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    wrapper = mount(App);
    await flushPromises();

    wrapper.vm.config.owner = "user";
    wrapper.vm.config.repo = "repo";
    await wrapper.find(".btn-gen").trigger("click");

    await flushPromises();
    await wrapper.vm.$nextTick();

    const rows = wrapper.findAll(".commit-row");
    expect(rows.length).toBe(2);

    // TEST DE LA DURÉE
    // Calcul auto : 10h - 9h = 60min.
    // MAIS le tag est [30]. Donc on attend 30.
    const durationInput = rows[0].find(".edit-duration").element.value;
    expect(durationInput).toBe("30");

    // TEST DU MESSAGE NETTOYÉ
    // Le message affiché ne doit plus contenir [DONE][30]
    const messageInput = rows[0].find(".edit-message").element.value;
    expect(messageInput).toBe("Tâche terminée");

    // TEST DU STATUT
    // On vérifie qu'un badge DONE est apparu
    const badge = rows[0].find(".status-badge.DONE");
    expect(badge.exists()).toBe(true);
  });

  // Test de sauvegarde (inchangé, mais inclus pour complétude)
  it("sauvegarde les modifications avec debounce", async () => {
    vi.useFakeTimers();
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    wrapper = mount(App);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    wrapper.vm.journalData = {
      keyDay: {
        commits: [
          { id: "123", message: "Original", duration: 10, dateKey: "keyDay" },
        ],
        totalMinutes: 10,
      },
    };
    await wrapper.vm.$nextTick();

    const inputMsg = wrapper.find(".edit-message");
    await inputMsg.setValue("Modif");
    await wrapper.vm.$nextTick();

    vi.advanceTimersByTime(1100);

    const calls = fetch.mock.calls;
    const postCall = calls.find((call) => call[1] && call[1].method === "POST");
    expect(postCall).toBeDefined();
    vi.useRealTimers();
  });
});
