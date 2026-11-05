import { create } from "zustand";

// stores/ — état global par domaine (Zustand).
interface ExampleState {
  selectedId: string | null;
  select: (id: string | null) => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  selectedId: null,
  select: (id) => set({ selectedId: id }),
}));
