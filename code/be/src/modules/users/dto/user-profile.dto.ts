import { ApiProperty } from '@nestjs/swagger';
import { LOCALES, type Locale } from '../../../common/locale';
import {
  DISPLAY_CURRENCIES,
  type DisplayCurrency,
} from '../../../common/display-currency';
import type { UserProfile } from '../users.repository';

export class UserProfileDto implements UserProfile {
  id!: string;
  email!: string;
  displayName!: string;

  @ApiProperty({ enum: DISPLAY_CURRENCIES })
  displayCurrency!: DisplayCurrency;

  @ApiProperty({ enum: LOCALES })
  locale!: Locale;

  createdAt!: Date;
  updatedAt!: Date;
}
