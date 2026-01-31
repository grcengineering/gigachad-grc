import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AssetType as PrismaAssetType, AssetStatus as PrismaAssetStatus, AssetCriticality as PrismaAssetCriticality } from '@prisma/client';

// Local enums matching Prisma schema for class-validator compatibility
export enum AssetType {
  SERVER = 'server',
  WORKSTATION = 'workstation',
  MOBILE = 'mobile',
  NETWORK = 'network',
  APPLICATION = 'application',
  DATA = 'data',
}

export enum AssetStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DECOMMISSIONED = 'decommissioned',
}

export enum AssetCriticality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Type assertions for Prisma compatibility
export type PrismaCompatibleAssetType = PrismaAssetType;
export type PrismaCompatibleAssetStatus = PrismaAssetStatus;
export type PrismaCompatibleAssetCriticality = PrismaAssetCriticality;

export class AssetFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @IsOptional()
  @IsString()
  department?: string;
}

export class CreateAssetDto {
  @IsString()
  name: string;

  @IsEnum(AssetType)
  type: AssetType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCriticality)
  criticality?: AssetCriticality;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  department?: string;
}

export class AssetResponseDto {
  id: string;
  externalId?: string;
  source: string;
  name: string;
  type: string;
  category?: string;
  status: string;
  criticality: string;
  owner?: string;
  location?: string;
  department?: string;
  metadata?: Record<string, unknown>;
  lastSyncAt?: Date;
  riskCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AssetDetailResponseDto extends AssetResponseDto {
  risks: {
    id: string;
    riskId: string;
    title: string;
    inherentRisk: string;
    status: string;
  }[];
}

export class AssetStatsDto {
  totalAssets: number;
  bySource: { source: string; count: number }[];
  byType: { type: string; count: number }[];
  byCriticality: { criticality: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentlySynced: number;
}

export class SyncResultDto {
  source: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  errors: string[];
  duration: number;
}



