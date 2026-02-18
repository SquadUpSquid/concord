import { create } from "zustand";
import { getMatrixClient } from "@/lib/matrix";

export interface Category {
  id: string;
  name: string;
  channelIds: string[];
}

interface CategoryState {
  /** spaceId -> ordered list of categories */
  categoriesBySpace: Record<string, Category[]>;
  /** spaceId -> ordered list of ALL section IDs (includes "__text", "__voice", and custom cat IDs) */
  sectionOrderBySpace: Record<string, string[]>;

  getCategories: (spaceId: string) => Category[];
  setCategories: (spaceId: string, categories: Category[]) => void;
  getSectionOrder: (spaceId: string) => string[];
  setSectionOrder: (spaceId: string, order: string[]) => void;

  /** Persist categories + section order to the Matrix space state event */
  saveCategories: (spaceId: string, categories: Category[], sectionOrder?: string[]) => Promise<void>;
  saveSectionOrder: (spaceId: string, order: string[]) => Promise<void>;
}

const STATE_EVENT_TYPE = "org.concord.space.categories";
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_ORDER: string[] = [];

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categoriesBySpace: {},
  sectionOrderBySpace: {},

  getCategories(spaceId: string): Category[] {
    return get().categoriesBySpace[spaceId] ?? EMPTY_CATEGORIES;
  },

  setCategories(spaceId: string, categories: Category[]) {
    set((s) => ({
      categoriesBySpace: { ...s.categoriesBySpace, [spaceId]: categories },
    }));
  },

  getSectionOrder(spaceId: string): string[] {
    return get().sectionOrderBySpace[spaceId] ?? EMPTY_ORDER;
  },

  setSectionOrder(spaceId: string, order: string[]) {
    set((s) => ({
      sectionOrderBySpace: { ...s.sectionOrderBySpace, [spaceId]: order },
    }));
  },

  async saveCategories(spaceId: string, categories: Category[], sectionOrder?: string[]) {
    const state = get();
    const order = sectionOrder ?? state.sectionOrderBySpace[spaceId] ?? EMPTY_ORDER;
    set((s) => ({
      categoriesBySpace: { ...s.categoriesBySpace, [spaceId]: categories },
      sectionOrderBySpace: { ...s.sectionOrderBySpace, [spaceId]: order },
    }));
    const client = getMatrixClient();
    if (!client) return;
    try {
      await client.sendStateEvent(spaceId, STATE_EVENT_TYPE as any, { categories, sectionOrder: order }, "");
    } catch (err) {
      console.error("Failed to save categories:", err);
    }
  },

  async saveSectionOrder(spaceId: string, order: string[]) {
    set((s) => ({
      sectionOrderBySpace: { ...s.sectionOrderBySpace, [spaceId]: order },
    }));
    const client = getMatrixClient();
    if (!client) return;
    const categories = get().categoriesBySpace[spaceId] ?? EMPTY_CATEGORIES;
    try {
      await client.sendStateEvent(spaceId, STATE_EVENT_TYPE as any, { categories, sectionOrder: order }, "");
    } catch (err) {
      console.error("Failed to save section order:", err);
    }
  },
}));

/** Load categories from a space's state events into the store */
export function loadCategoriesFromSpace(spaceId: string): void {
  const client = getMatrixClient();
  if (!client) return;
  const room = client.getRoom(spaceId);
  if (!room) return;
  const event = room.currentState.getStateEvents(STATE_EVENT_TYPE, "");
  if (!event) return;
  const content = event.getContent();
  const store = useCategoryStore.getState();
  if (Array.isArray(content?.categories)) {
    store.setCategories(spaceId, content.categories);
  }
  if (Array.isArray(content?.sectionOrder)) {
    store.setSectionOrder(spaceId, content.sectionOrder);
  }
}

export function generateCategoryId(): string {
  return "cat_" + Math.random().toString(36).slice(2, 10);
}

/** Build a complete section order, ensuring __text and __voice are present and all custom cats are included */
export function buildSectionOrder(storedOrder: string[], categories: Category[]): string[] {
  const catIds = new Set(categories.map((c) => c.id));
  const allKnown = new Set(["__text", "__voice", ...catIds]);

  if (storedOrder.length === 0) {
    return ["__text", ...categories.map((c) => c.id), "__voice"];
  }

  // Filter out stale IDs that no longer exist
  const cleaned = storedOrder.filter((id) => allKnown.has(id));
  const present = new Set(cleaned);

  // Append any missing sections
  if (!present.has("__text")) cleaned.unshift("__text");
  if (!present.has("__voice")) cleaned.push("__voice");
  for (const cat of categories) {
    if (!present.has(cat.id)) {
      const voiceIdx = cleaned.indexOf("__voice");
      cleaned.splice(voiceIdx, 0, cat.id);
    }
  }

  return cleaned;
}
