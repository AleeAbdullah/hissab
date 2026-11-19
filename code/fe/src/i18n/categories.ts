import { i18n } from './index';
import type {
  PersonalIncomeCategoryCode,
  SharedExpenseCategoryCode
} from '@/api/contracts';

// Category names are fixed system codes; the server's English `name` is not shown.
export const categoryName = (
  code: SharedExpenseCategoryCode | PersonalIncomeCategoryCode
) => i18n.t(`common:category.${code}`);
