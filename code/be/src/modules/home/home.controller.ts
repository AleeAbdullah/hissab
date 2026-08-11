import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import type { AuthPrincipal } from '../../common/auth/auth-principal';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { HomeDto } from './home.dto';
import { HomeService } from './home.service';

@ApiBearerAuth()
@ApiTags('home')
@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  @ApiOkResponse({ type: HomeDto })
  getHome(@CurrentUser() user: AuthPrincipal): Promise<HomeDto> {
    return this.home.getHome(user.userId);
  }
}
