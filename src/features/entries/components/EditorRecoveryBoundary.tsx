import { Component, type ErrorInfo, type ReactNode } from "react";

type EditorRecoveryBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

export class EditorRecoveryBoundary extends Component<
  EditorRecoveryBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Rich text editor failed; using recovery editor", error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
