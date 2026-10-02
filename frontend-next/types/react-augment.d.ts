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
  // These generic parameters must remain to match React's original declarations.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    children?: ReactNode | undefined;
  }

  // Allow children on all forwardRef components
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface RefAttributes<T> {
    children?: ReactNode | undefined;
  }

  // React 19: FunctionComponent returns ReactNode (not ReactElement | null).
  // Overriding to ReactNode ensures ForwardRefExoticComponent (lucide icons,
  // Radix UI, shadcn) is assignable to ComponentType / ElementType.
  interface FunctionComponent<P = object> {
    (props: P & { children?: ReactNode | undefined }, context?: any): ReactNode;
  }
}
