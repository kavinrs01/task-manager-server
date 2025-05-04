import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtConfig } from '../config/jwt.config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(JwtConfig.KEY)
    private readonly jwtConfig: ConfigType<typeof JwtConfig>,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePasswords(
    raw: string,
    hashed: string,
  ): Promise<boolean> {
    return bcrypt.compare(raw, hashed);
  }

  private generateToken(
    user: { id: string; role: string; name: string; email: string },
    type: 'access' | 'refresh',
  ): string {
    const expiresIn =
      type === 'access'
        ? this.jwtConfig.accessTokenExpiresIn
        : this.jwtConfig.refreshTokenExpiresIn;

    return this.jwtService.sign(
      {
        sub: {
          ...user,
        },
      },
      {
        secret: this.jwtConfig.jwtSecret,
        expiresIn,
      },
    );
  }

  async register(name: string, email: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new ConflictException('Email already exists');

    const hashedPassword = await this.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    const tokenPayload = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    const accessToken = this.generateToken(tokenPayload, 'access');
    const refreshToken = this.generateToken(tokenPayload, 'refresh');
    const expiresAt = DateTime.now().plus({ days: 7 }).toJSDate();

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await this.comparePasswords(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    const tokenPayload = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };
    const accessToken = this.generateToken(tokenPayload, 'access');
    const refreshToken = this.generateToken(tokenPayload, 'refresh');
    const expiresAt = DateTime.now().plus({ days: 7 }).toJSDate();

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshTokens(oldRefreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      DateTime.fromJSDate(tokenRecord.expiresAt) < DateTime.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const tokenPayload = {
      id: tokenRecord.user.id,
      role: tokenRecord.user.role,
      name: tokenRecord.user.name,
      email: tokenRecord.user.email,
    };
    const accessToken = this.generateToken(tokenPayload, 'access');
    const newRefreshToken = this.generateToken(tokenPayload, 'refresh');
    const newExpiresAt = DateTime.now().plus({ days: 7 }).toJSDate();

    await this.prisma.refreshToken.delete({
      where: { token: oldRefreshToken },
    });
    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: tokenRecord.userId,
        expiresAt: newExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.prisma.refreshToken.delete({
        where: { token: refreshToken },
      });
    }
    return 'Logged out successfully';
  }
}
