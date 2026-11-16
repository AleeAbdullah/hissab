import { cva } from 'class-variance-authority';

// The one bordered surface: cards use 16-point corners, controls 12-point with the higher-contrast input border.
export const surfaceVariants = cva('border bg-card', {
  variants: {
    variant: {
      card: 'overflow-hidden rounded-2xl border-border',
      control: 'min-h-12 rounded-xl border-input'
    }
  },
  defaultVariants: { variant: 'card' }
});
