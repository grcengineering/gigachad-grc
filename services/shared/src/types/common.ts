// Common types used across the GRC platform

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable {
  deletedAt?: Date | null;
}

export interface Auditable {
  createdBy: string;
  updatedBy: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type Status = 'active' | 'inactive' | 'archived';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}



