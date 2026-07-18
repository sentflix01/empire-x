/**
 * React 19 removed implicit `children` from component props.
 * This augmentation restores it globally for compatibility with
 * shadcn/ui, Radix UI, and other forwardRef components.
 *
 * This is the recommended migration path per the React 19 upgrade guide
 * and shadcn/ui documentation.
 *
 * Feature: professional-grade-upgrade — TypeScript strict mode fix
 * Requirements: 1.4
 */
import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    children?: ReactNode | undefined;
  }

  // Allow children on all forwardRef components
  interface RefAttributes<T> {
    children?: ReactNode | undefined;
  }

  // Allow children on all function components
  interface FunctionComponent<P = object> {
    (props: P & { children?: ReactNode | undefined }, context?: any): ReactElement<any, any> | null;
  }
}
