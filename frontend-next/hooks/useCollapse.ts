/**
 * useCollapse — manages collapsed/expanded state for a list section.
 *
 * @param total     Total number of items in the list
 * @param threshold Max items shown in collapsed state (default: 5)
 *
 * Returns:
 *   visibleCount   — number of items to render
 *   isExpanded     — whether the section is currently expanded
 *   showMoreButton — true when total > threshold and section is collapsed
 *   expand         — callback to expand the section
 *   collapse       — callback to collapse the section
 *   reset          — callback to reset to collapsed state
 */
import { useState, useCallback } from 'react';

export interface CollapseState {
  visibleCount: number;
  isExpanded: boolean;
  showMoreButton: boolean;
  expand: () => void;
  collapse: () => void;
  reset: () => void;
}

export function useCollapse(total: number, threshold = 5): CollapseState {
  const [isExpanded, setIsExpanded] = useState(false);

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);
  const reset = useCallback(() => setIsExpanded(false), []);

  const visibleCount = isExpanded ? total : Math.min(total, threshold);
  const showMoreButton = total > threshold && !isExpanded;

  return { visibleCount, isExpanded, showMoreButton, expand, collapse, reset };
}
