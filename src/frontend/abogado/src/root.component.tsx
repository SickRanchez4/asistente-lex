import UiPreview from './ui-preview';
declare const __AL_UI_PREVIEW__: boolean;

export default function Root() {
  return (
    <main id="al-abogado-content" className="al-page" tabIndex={-1}>
      <p className="al-eyebrow">Espacio del Abogado</p>
      <h1>Tu trabajo jurídico, con una experiencia coherente</h1>
      <section className="al-card">
        <h2>Base de la interfaz React</h2>
        <p>Los estados, formularios y formatos compartidos están preparados para las funcionalidades del Abogado.</p>
        <p className="al-muted">Vista técnica sin autenticación. La navegación de trabajo se conectará cuando estén disponibles la sesión y sus pantallas reales.</p>
      </section>
      {__AL_UI_PREVIEW__ && <UiPreview />}
    </main>
  );
}
