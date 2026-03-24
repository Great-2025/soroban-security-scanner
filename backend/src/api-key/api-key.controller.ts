import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiKeyService, GenerateApiKeyResponse } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ status: 201, description: 'API key generated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async generate(@Body() createApiKeyDto: CreateApiKeyDto, @Request() req): Promise<GenerateApiKeyResponse> {
    return this.apiKeyService.generateApiKey(createApiKeyDto, req.user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Get all API keys for current user' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async findAll(@Request() req) {
    return this.apiKeyService.findAll(req.user);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all API keys (Admin only)' })
  @ApiResponse({ status: 200, description: 'All API keys retrieved successfully' })
  async findAllForAdmin() {
    return this.apiKeyService.findAllForAdmin();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Get a specific API key' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.apiKeyService.findOne(id, req.user);
  }

  @Post(':id/rotate')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate an existing API key' })
  @ApiResponse({ status: 200, description: 'API key rotated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async rotate(@Param('id') id: string, @Request() req): Promise<GenerateApiKeyResponse> {
    return this.apiKeyService.rotate(id, req.user);
  }

  @Post(':id/revoke')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revoke(@Param('id') id: string, @Request() req) {
    return this.apiKeyService.revoke(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Update API key details' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async update(@Param('id') id: string, @Body() updateApiKeyDto: UpdateApiKeyDto, @Request() req) {
    return this.apiKeyService.findOne(id, req.user);
  }
}
