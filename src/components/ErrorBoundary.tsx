import { Component, type ErrorInfo, type ReactNode } from 'react';
import { nl } from '../i18n/nl';

interface State {
  fout: Error | null;
}

/**
 * Vangt een crash in een scherm op en toont een rustige melding in plaats van een leeg scherm.
 * De gegevens (ook een lopende training) staan in IndexedDB en blijven dus bewaard.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { fout: null };

  static getDerivedStateFromError(fout: Error): State {
    return { fout };
  }

  componentDidCatch(fout: Error, info: ErrorInfo) {
    console.error(fout, info.componentStack);
  }

  componentDidUpdate(vorige: { resetKey?: string }) {
    // Naar een ander scherm gaan wist de fout.
    if (this.state.fout && vorige.resetKey !== this.props.resetKey) this.setState({ fout: null });
  }

  render() {
    const { fout } = this.state;
    if (!fout) return this.props.children;
    const t = nl.fout;
    return (
      <section className="screen error-screen" role="alert">
        <h1>{t.titel}</h1>
        <p className="muted">{t.uitleg}</p>
        <details>
          <summary>{t.melding}</summary>
          <pre className="error-text">{fout.message || String(fout)}</pre>
        </details>
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            window.location.hash = '#/';
            this.setState({ fout: null });
          }}
        >
          {t.naarVandaag}
        </button>
        <button className="btn btn-block" onClick={() => window.location.reload()}>
          {t.herladen}
        </button>
      </section>
    );
  }
}
