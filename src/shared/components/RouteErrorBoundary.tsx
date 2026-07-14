import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useI18n } from "../i18n";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route rendering failed", error, info);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const fallback = (
    <section
      role="alert"
      className="ws-surface mx-auto max-w-2xl rounded-[2rem] px-6 py-12 text-center sm:px-10"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-300">
        <AlertTriangle size={24} />
      </span>
      <p className="ws-eyebrow mt-6">{t("error.eyebrow")}</p>
      <h2 className="ws-display mt-3 text-4xl font-semibold text-[var(--text)]">
        {t("error.title")}
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--text-muted)]">
        {t("error.description")}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ws-button-primary flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
        >
          <RefreshCw size={16} />
          {t("error.reload")}
        </button>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="ws-button-secondary flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
        >
          <Home size={16} />
          {t("error.dashboard")}
        </button>
      </div>
    </section>
  );

  return (
    <ErrorBoundary key={`${location.pathname}${location.search}`} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
