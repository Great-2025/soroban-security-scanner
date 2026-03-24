import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus } from './entities/api-key.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export interface ApiKeyResponse {
  id: string;
  keyId: string;
  name: string;
  description?: string;
  status: ApiKeyStatus;
  lastUsedAt?: Date;
  expiresAt?: Date;
  usageCount: number;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateApiKeyResponse {
  apiKey: ApiKeyResponse;
  plainTextKey: string;
}

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async generateApiKey(createApiKeyDto: CreateApiKeyDto, user: User): Promise<GenerateApiKeyResponse> {
    const plainTextKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyId = `key_${crypto.randomBytes(16).toString('hex')}`;
    const hashedKey = await bcrypt.hash(plainTextKey, 12);

    const apiKey = this.apiKeyRepository.create({
      keyId,
      hashedKey,
      name: createApiKeyDto.name,
      description: createApiKeyDto.description,
      permissions: createApiKeyDto.permissions || ['read'],
      expiresAt: createApiKeyDto.expiresAt,
      userId: user.id,
      user,
    });

    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    return {
      apiKey: this.sanitizeApiKey(savedApiKey),
      plainTextKey,
    };
  }

  async findAll(user: User): Promise<ApiKeyResponse[]> {
    const apiKeys = await this.apiKeyRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    return apiKeys.map(key => this.sanitizeApiKey(key));
  }

  async findAllForAdmin(): Promise<ApiKeyResponse[]> {
    const apiKeys = await this.apiKeyRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return apiKeys.map(key => ({
      ...this.sanitizeApiKey(key),
      user: {
        id: key.user.id,
        email: key.user.email,
        name: key.user.name,
        role: key.user.role,
      },
    }));
  }

  async findOne(id: string, user: User): Promise<ApiKeyResponse> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (user.role !== UserRole.ADMIN && apiKey.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return this.sanitizeApiKey(apiKey);
  }

  async rotate(id: string, user: User): Promise<GenerateApiKeyResponse> {
    const existingKey = await this.findOne(id, user);

    const plainTextKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = await bcrypt.hash(plainTextKey, 12);

    await this.apiKeyRepository.update(id, {
      hashedKey,
      updatedAt: new Date(),
    });

    const updatedKey = await this.apiKeyRepository.findOne({ where: { id } });
    
    return {
      apiKey: this.sanitizeApiKey(updatedKey!),
      plainTextKey,
    };
  }

  async revoke(id: string, user: User): Promise<ApiKeyResponse> {
    const apiKey = await this.findOne(id, user);

    await this.apiKeyRepository.update(id, {
      status: ApiKeyStatus.REVOKED,
      updatedAt: new Date(),
    });

    const revokedKey = await this.apiKeyRepository.findOne({ where: { id } });
    return this.sanitizeApiKey(revokedKey!);
  }

  async validateApiKey(plainTextKey: string): Promise<ApiKey | null> {
    const apiKeys = await this.apiKeyRepository.find({
      where: { status: ApiKeyStatus.ACTIVE },
      relations: ['user'],
    });

    for (const apiKey of apiKeys) {
      if (await bcrypt.compare(plainTextKey, apiKey.hashedKey)) {
        await this.updateLastUsed(apiKey.id);
        return apiKey;
      }
    }

    return null;
  }

  private async updateLastUsed(id: string): Promise<void> {
    await this.apiKeyRepository.update(id, {
      lastUsedAt: new Date(),
      usageCount: () => 'usageCount + 1',
    });
  }

  private sanitizeApiKey(apiKey: ApiKey): ApiKeyResponse {
    return {
      id: apiKey.id,
      keyId: apiKey.keyId,
      name: apiKey.name,
      description: apiKey.description,
      status: apiKey.status,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      usageCount: apiKey.usageCount,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    };
  }

  async cleanupExpiredKeys(): Promise<void> {
    await this.apiKeyRepository
      .createQueryBuilder()
      .update(ApiKey)
      .set({ status: ApiKeyStatus.EXPIRED })
      .where('expiresAt < :now', { now: new Date() })
      .andWhere('status = :status', { status: ApiKeyStatus.ACTIVE })
      .execute();
  }
}
