import type { Metadata } from 'next';
import './download.css';

export const metadata:Metadata={title:'Instalar en Android · academia PAR',description:'Descarga la aplicación Android de academia PAR.',robots:{index:false,follow:false}};

export default function AndroidDownload(){
  return <main className="android-download">
    <a className="android-brand" href="/" aria-label="academia PAR · Abrir la web"><img src="/favicon.svg" width="40" height="40" alt=""/><span>academia <strong>PAR</strong></span></a>
    <section className="android-card" aria-labelledby="android-title">
      <span className="android-label">APLICACIÓN ANDROID</span>
      <h1 id="android-title">La academia, en tu móvil.</h1>
      <p>Tus ejercicios, fichas y clases, con los mismos contenidos que en la web.</p>
      <a className="android-install" href="/android/academia-par.apk" download="academia-par.apk">Descargar APK <span aria-hidden="true">↓</span></a>
      <p className="android-details">Versión 1.0 · Android 8 o posterior · Requiere internet</p>
      <div className="android-steps">
        <h2>Cómo instalarla</h2>
        <ol>
          <li>Descarga el archivo en tu teléfono o tablet Android.</li>
          <li>Ábrelo desde las descargas. Si Android lo solicita, permite instalar desde esa aplicación.</li>
          <li>Pulsa <strong>Instalar</strong> y abre <strong>academia PAR</strong>.</li>
          <li>Elige tu perfil. El panel docente mantiene su contraseña.</li>
        </ol>
      </div>
      <p className="android-note">La aplicación utiliza los datos de la academia. No hay que copiar ejercicios ni volver a subir las fichas.</p>
      <a className="android-web" href="/">Abrir la versión web</a>
    </section>
    <footer>Para iPhone y iPad, utiliza la versión web. <a href="/android/release.json">Información del archivo</a></footer>
  </main>;
}
