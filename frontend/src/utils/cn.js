import clsx from 'clsx'

/** Merge class names, filtering out falsy values. */
export function cn(...inputs) {
  return clsx(inputs)
}
