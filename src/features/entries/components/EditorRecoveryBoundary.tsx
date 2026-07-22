import { Component, type ErrorInfo, type ReactNode } from "react";

type EditorRecoveryBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode | ((error: Error | null) => ReactNode);
  resetKey?: string;
};

export class EditorRecoveryBoundary extends Component<
  EditorRecoveryBoundaryProps,
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Rich text editor failed; using recovery editor", error, info);
  }

  componentDidUpdate(previousProps: EditorRecoveryBoundaryProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return typeof this.props.fallback === "function"
      ? this.props.fallback(this.state.error)
      : this.props.fallback;
  }
}
