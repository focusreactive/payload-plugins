"use client";

import type { ReactNode } from "react";

import { Component } from "react";

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  onError: () => void;
};

type State = { children: ReactNode; hasFailed: boolean };

export class UnsavedRenderBoundary extends Component<Props, State> {
  override state: State = { children: null, hasFailed: false };

  static getDerivedStateFromProps({ children }: Props, state: State): Partial<State> | null {
    return children === state.children ? null : { children, hasFailed: false };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasFailed: true };
  }

  override componentDidCatch(): void {
    this.props.onError();
  }

  override render(): ReactNode {
    const { children, fallback } = this.props;
    return this.state.hasFailed ? fallback : children;
  }
}
