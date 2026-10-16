import { nl } from '../i18n/nl';

export default function TodayScreen() {
  return (
    <section className="screen">
      <h1>{nl.today.title}</h1>
      <p className="muted">{nl.today.placeholder}</p>
    </section>
  );
}
