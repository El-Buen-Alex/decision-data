import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  const findOneMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: findOneMock },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-token') },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    findOneMock.mockReset();
  });

  it('throws UnauthorizedException for an unknown email', async () => {
    findOneMock.mockResolvedValue(null);
    await expect(service.login('missing@test.com', 'whatever')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns a signed token for correct credentials', async () => {
    const passwordHash = await bcrypt.hash('demo1234', 10);
    findOneMock.mockResolvedValue({
      id: 'user-1',
      email: 'ana.demo@decisiondata.test',
      passwordHash,
    });

    const result = await service.login(
      'ana.demo@decisiondata.test',
      'demo1234',
    );

    expect(result.accessToken).toBe('signed-token');
  });
});
