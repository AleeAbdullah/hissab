import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  type LucideIcon
} from 'lucide-react-native';
import { cssInterop } from 'nativewind';

export type Icon = LucideIcon;

export const Icons = {
  add: Plus,
  arrowUpDown: ArrowUpDown,
  check: Check,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  eye: Eye,
  eyeOff: EyeOff
};

Object.values(Icons).forEach((Icon) => {
  cssInterop(Icon, {
    className: {
      target: 'style',
      nativeStyleToProp: {
        height: 'size',
        width: 'size'
      }
    }
  });
});

export type IconName = keyof typeof Icons;
