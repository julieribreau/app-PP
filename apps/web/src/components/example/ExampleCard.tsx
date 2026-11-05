// Composant LOCAL à l'app web. Dès qu'il devient mutualisable web/mobile,
// le remonter dans packages/ui — cf brique ui-partagée. Story :
// apps/storybook-web/stories/molecules/ExampleCard.stories.tsx.
// Styles via tokens du design system (app/globals.css), jamais de couleur hardcodée.
export interface ExampleCardProps {
  readonly title: string;
  readonly description: string;
}

export function ExampleCard({ title, description }: ExampleCardProps) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      <p className="card-text">{description}</p>
    </section>
  );
}
