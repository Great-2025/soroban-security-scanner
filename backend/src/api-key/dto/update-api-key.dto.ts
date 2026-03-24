import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  permissions?: string[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
