import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyService } from './api-key.service';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { User, UserRole } from '../user/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let apiKeyRepository: Repository<ApiKey>;

  const mockUser: User = {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.DEVELOPER,
    password: 'hashed-password',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeys: [],
  };

  const mockApiKey: ApiKey = {
    id: 'key-id',
    keyId: 'key_test123',
    hashedKey: 'hashed-key',
    name: 'Test Key',
    description: 'Test Description',
    status: ApiKeyStatus.ACTIVE,
    usageCount: 0,
    permissions: ['read'],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: mockUser.id,
    user: mockUser,
  };

  const mockApiKeyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    apiKeyRepository = module.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('should generate a new API key', async () => {
      const createApiKeyDto = {
        name: 'Test Key',
        description: 'Test Description',
        permissions: ['read'],
      };

      mockApiKeyRepository.create.mockReturnValue(mockApiKey);
      mockApiKeyRepository.save.mockResolvedValue(mockApiKey);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-key' as never);
      jest.spyOn(crypto, 'randomBytes').mockReturnValue({
        toString: jest.fn().mockReturnValue('test123'),
      } as any);

      const result = await service.generateApiKey(createApiKeyDto, mockUser);

      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('plainTextKey');
      expect(result.apiKey.name).toBe(createApiKeyDto.name);
      expect(mockApiKeyRepository.create).toHaveBeenCalled();
      expect(mockApiKeyRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all API keys for a user', async () => {
      const mockApiKeys = [mockApiKey];
      mockApiKeyRepository.find.mockResolvedValue(mockApiKeys);

      const result = await service.findAll(mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockApiKey.name);
      expect(mockApiKeyRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an API key by id', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      const result = await service.findOne(mockApiKey.id, mockUser);

      expect(result.id).toBe(mockApiKey.id);
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockApiKey.id },
        relations: ['user'],
      });
    });

    it('should throw error if API key not found', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', mockUser)).rejects.toThrow(
        'API key not found'
      );
    });
  });

  describe('revoke', () => {
    it('should revoke an API key', async () => {
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey);
      mockApiKeyRepository.update.mockResolvedValue(undefined);
      mockApiKeyRepository.findOne.mockResolvedValue({
        ...mockApiKey,
        status: ApiKeyStatus.REVOKED,
      });

      const result = await service.revoke(mockApiKey.id, mockUser);

      expect(result.status).toBe(ApiKeyStatus.REVOKED);
      expect(mockApiKeyRepository.update).toHaveBeenCalledWith(mockApiKey.id, {
        status: ApiKeyStatus.REVOKED,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('validateApiKey', () => {
    it('should validate a correct API key', async () => {
      const plainTextKey = 'sk_live_test123';
      mockApiKeyRepository.find.mockResolvedValue([mockApiKey]);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockApiKeyRepository.update.mockResolvedValue(undefined);

      const result = await service.validateApiKey(plainTextKey);

      expect(result).toBe(mockApiKey);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainTextKey, mockApiKey.hashedKey);
    });

    it('should return null for invalid API key', async () => {
      const plainTextKey = 'invalid-key';
      mockApiKeyRepository.find.mockResolvedValue([mockApiKey]);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateApiKey(plainTextKey);

      expect(result).toBeNull();
    });
  });
});
