// Variante WEB — HTML sémantique (accessibilité RGAA). Styles : `@nutrion/ui/ui.css`, sur les
// tokens, jamais de valeur en dur. Story : apps/storybook-web/stories/atoms/Button.stories.tsx.
export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled = false }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={`ui-button ui-button--${variant}`}
    >
      {label}
    </button>
  );
}
