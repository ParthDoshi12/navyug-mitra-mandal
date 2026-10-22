import { Component } from 'react';

// Keeps one broken screen from blanking the whole app.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="error-box">Something went wrong on this screen. / इस स्क्रीन में कोई गड़बड़ी हुई।</div>
        <p className="muted small">{String(this.state.error.message || this.state.error)}</p>
        <button className="btn primary block" onClick={() => location.reload()}>
          Reload / फिर से लोड करें
        </button>
      </div>
    );
  }
}
