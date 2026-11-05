import { create } from "zustand";

// « Votre panier invité a été ajouté à votre compte » : un fait de la connexion, gardé ici et
// non dans le panier en cache, que toute relecture (changement de langue juste après la
// connexion) remplaçait par sa version serveur, sans la fusion.
interface CartNoticeState {
  merged: boolean;
  setMerged: (merged: boolean) => void;
}

export const useCartNoticeStore = create<CartNoticeState>((set) => ({
  merged: false,
  setMerged: (merged) => set({ merged }),
}));
