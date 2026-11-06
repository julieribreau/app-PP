import * as React from "react";

import { track } from "@/lib/analytics/posthog";
import type { Cart } from "@/types/api";

/** `cart.viewed` une fois par affichage de l'écran panier, dès que le panier est chargé. */
export function useCartViewed(cart: Cart | undefined): void {
  const sent = React.useRef(false);
  React.useEffect(() => {
    if (!cart || sent.current) return;
    sent.current = true;
    track("cart.viewed", { itemCount: cart.itemCount, totalCents: cart.totalCents });
  }, [cart]);
}
