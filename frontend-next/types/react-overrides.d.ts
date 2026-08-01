/**
 * React 19 forwardRef children type override.
 *
 * React 19 removed implicit children from ComponentPropsWithoutRef/ComponentPropsWithRef
 * which breaks shadcn/ui and Radix UI components that rely on it.
 *
 * This declaration re-adds PropsWithChildren compatibility globally
 * so all existing components compile without per-file changes.
 *
 * Feature: professional-grade-upgrade
 * Requirement: 1.4
 */

import 'react';

declare module 'react' {
  // React 19: FunctionComponent returns ReactNode (not ReactElement | null).
  // This ensures ForwardRefExoticComponent (lucide-react, Radix, shadcn) is
  // assignable to ComponentType/ElementType props across the codebase.
  interface FunctionComponent<P = object> {
    (props: P & { children?: React.ReactNode }, context?: any): React.ReactNode;
  }
}
