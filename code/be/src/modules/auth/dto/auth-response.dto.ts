import { ApiProperty } from '@nestjs/swagger';
import { LOCALES, type Locale } from '../../../common/locale';
import { DISPLAY_CURRENCIES } from '../../../common/display-currency';
import type { AuthTokens, AuthUser } from '../auth.types';

export class AuthUserDto implements AuthUser {
  id!: string;
  email!: string;
  displayName!: string;

  @ApiProperty({ enum: DISPLAY_CURRENCIES })
  displayCurrency!: string;

  @ApiProperty({ enum: LOCALES })
  locale!: Locale;
}

export class AuthTokensDto implements AuthTokens {
  accessToken!: string;
  accessTokenExpiresAt!: string;
  refreshToken!: string;
  refreshTokenExpiresAt!: string;
  sessionId!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
