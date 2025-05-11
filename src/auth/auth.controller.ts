import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { CurrentAuthUser } from '../utils/types';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  async register(@Body() body: RegisterDto) {
    return await this.authService.register(body);
  }

  @Post('login')
  @Public()
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body);
  }

  @Post('refresh')
  @Public()
  async refreshTokens(@Body() body: RefreshTokenDto) {
    return await this.authService.refreshTokens(body.refreshToken);
  }

  @Get('me')
  async getMe(@CurrentUser() user: CurrentAuthUser) {
    return this.authService.getMe(user.id);
  }
  @Get('team-members')
  async getTeamMembers(@CurrentUser() user: CurrentAuthUser) {
    return this.authService.getTeamMembers(user);
  }
}
