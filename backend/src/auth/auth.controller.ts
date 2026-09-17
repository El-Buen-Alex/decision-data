import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<LoginResult> {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}
