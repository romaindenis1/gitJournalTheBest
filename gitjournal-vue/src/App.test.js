import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "./App.vue";
import html2pdf from "html2pdf.js";

// --- UTILITAIRE ---
// Permet d'attendre que toutes les promesses en attente soient résolues
// Utile car fetch + json + updates Vue prennent plusieurs "ticks"
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// --- MOCKS GLOBAUX ---

// 1. Mock de html2pdf
vi.mock("html2pdf.js", () => ({
  default: vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    save: vi.fn(),
  })),
}));

// 2. Mock de fetch (API REST)
global.fetch = vi.fn();

// 3. Mock du LocalStorage
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

  const mockCommits = [
    {
      sha: "sha2",
      commit: {
        message: "Commit B\nDescription",
        author: { date: "2023-10-10T10:00:00Z" },
      },
      html_url: "http://github.com/url2",
    },
    {
      sha: "sha1",
      commit: { message: "Commit A", author: { date: "2023-10-10T09:00:00Z" } },
      html_url: "http://github.com/url1",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Par défaut, fetch réussit et renvoie un objet vide pour loadEditsFromServer
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("charge la configuration depuis le localStorage au montage", async () => {
    localStorageMock.setItem("gj_owner", "Facebook");
    localStorageMock.setItem("gj_repo", "React");

    wrapper = mount(App);
    await flushPromises(); // On attend que le onMounted soit fini

    expect(wrapper.vm.config.owner).toBe("Facebook");
    expect(wrapper.vm.config.repo).toBe("React");
  });

  it("affiche une erreur si on clique sur Générer sans config", async () => {
    wrapper = mount(App);
    await flushPromises();

    await wrapper.find(".btn-gen").trigger("click");
    await wrapper.vm.$nextTick(); // On attend la mise à jour du DOM

    expect(wrapper.find(".error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Veuillez remplir le propriétaire");
  });

  it("récupère les commits et calcule correctement la durée (Logique Métier)", async () => {
    // CORRECTION : On utilise mockImplementation pour répondre intelligemment selon l'URL
    fetch.mockImplementation((url) => {
      // Si l'URL contient "github", on renvoie les commits mockés
      if (url.toString().includes("github.com")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCommits),
        });
      }
      // Sinon (appel vers localhost:3000/edits), on renvoie vide
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    wrapper = mount(App);
    // Attente du montage initial (qui fait un fetch vers localhost)
    await flushPromises();

    wrapper.vm.config.owner = "antoineFabr";
    wrapper.vm.config.repo = "Antoine-sCMS";

    // Action : Clic
    await wrapper.find(".btn-gen").trigger("click");

    // On attend la résolution des promesses (fetch edits + fetch github)
    await flushPromises();
    await wrapper.vm.$nextTick();

    const rows = wrapper.findAll(".commit-row");
    expect(rows.length).toBe(2);

    const firstRowDuration = rows[0].find(".edit-duration").element.value;
    expect(firstRowDuration).toBe("60");

    const firstRowMessage = rows[0].find(".edit-message").element.value;
    expect(firstRowMessage).toBe("Commit B");
  });

  it("appelle html2pdf lors du clic sur export", async () => {
    wrapper = mount(App);
    await flushPromises();

    wrapper.vm.journalData = { dummy: {} };
    await wrapper.vm.$nextTick();

    await wrapper.find(".btn-pdf").trigger("click");

    expect(html2pdf).toHaveBeenCalled();
  });
});
