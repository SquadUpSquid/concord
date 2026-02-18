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

  getCategories: (spaceId: string) => Category[];
  setCategories: (spaceId: string, categories: Category[]) => void;

  /** Persist categories to the Matrix space state event */
  saveCategories: (spaceId: string, categories: Category[]) => Promise<void>;
}

const STATE_EVENT_TYPE = "org.concord.space.categories";
const EMPTY_CATEGORIES: Category[] = [];

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categoriesBySpace: {},

  getCategories(spaceId: string): Category[] {
    return get().categoriesBySpace[spaceId] ?? EMPTY_CATEGORIES;
  },

  setCategories(spaceId: string, categories: Category[]) {
    set((s) => ({
      categoriesBySpace: { ...s.categoriesBySpace, [spaceId]: categories },
    }));
  },

  async saveCategories(spaceId: string, categories: Category[]) {
    set((s) => ({
      categoriesBySpace: { ...s.categoriesBySpace, [spaceId]: categories },
    }));
    const client = getMatrixClient();
    if (!client) return;
    try {
      await client.sendStateEvent(spaceId, STATE_EVENT_TYPE as any, { categories }, "");
    } catch (err) {
      console.error("Failed to save categories:", err);
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
  if (Array.isArray(content?.categories)) {
    useCategoryStore.getState().setCategories(spaceId, content.categories);
  }
}

export function generateCategoryId(): string {
  return "cat_" + Math.random().toString(36).slice(2, 10);
}
