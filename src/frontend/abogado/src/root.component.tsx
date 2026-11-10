import UiPreview from './ui-preview';
declare const __AL_UI_PREVIEW__: boolean;

export default function Root() {
  return (
    <main id="al-abogado-content" className="al-page" tabIndex={-1}>
      <p className="al-eyebrow">Espacio del Abogado</p>
      <h1>Mi espacio</h1>
      <section>
        <h2>Secciones</h2>
        <p>No hay secciones disponibles.</p>
      </section>
      {__AL_UI_PREVIEW__ && <UiPreview />}
    </main>
  );
}
