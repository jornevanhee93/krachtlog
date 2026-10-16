import { nl } from '../i18n/nl';

export default function HistoryScreen() {
  return (
    <section className="screen">
      <h1>{nl.history.title}</h1>
      <p className="muted">{nl.history.placeholder}</p>
    </section>
  );
}
