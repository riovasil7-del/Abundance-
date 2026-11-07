/** Next index when Tab or Shift+Tab moves inside a dialog. */
export function cycleFocusIndex(current: number, count: number, reverse: boolean): number {
  if (count <= 0) return 0;
  if (current < 0) return reverse ? count - 1 : 0;
  if (reverse) return (current - 1 + count) % count;
  return (current + 1) % count;
}
