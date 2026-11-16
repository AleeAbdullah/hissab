import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Eye,
  EyeOff,
  Plus,
  type LucideIcon
} from 'lucide-react-native';
import { cssInterop } from 'nativewind';

export type Icon = LucideIcon;

export const Icons = {
  add: Plus,
  check: Check,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  circle: Circle,
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
