import { nl } from '../i18n/nl';

export default function ExercisesScreen() {
  return (
    <section className="screen">
      <h1>{nl.exercises.title}</h1>
      <p className="muted">{nl.exercises.placeholder}</p>
    </section>
  );
}
