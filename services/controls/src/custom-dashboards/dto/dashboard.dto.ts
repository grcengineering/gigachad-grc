import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsNumber,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// Widget types enum
export enum WidgetType {
  KPI_CARD = 'kpi_card',
  PIE_CHART = 'pie_chart',
  DONUT_CHART = 'donut_chart',
  BAR_CHART = 'bar_chart',
  LINE_CHART = 'line_chart',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  PROGRESS = 'progress',
  LIST = 'list',
  GAUGE = 'gauge',
  MARKDOWN = 'markdown',
  IFRAME = 'iframe',
}

// Data source types
export enum DataSourceType {
  CONTROLS = 'controls',
  RISKS = 'risks',
  POLICIES = 'policies',
  VENDORS = 'vendors',
  EVIDENCE = 'evidence',
  EMPLOYEES = 'employees',
  AUDITS = 'audits',
  INTEGRATIONS = 'integrations',
  FRAMEWORKS = 'frameworks',
}

// Query filter operators
export enum FilterOperator {
  EQ = 'eq',
  NEQ = 'neq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  CONTAINS = 'contains',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
}

// Aggregation functions
export enum AggregationFunction {
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
}

// Filter definition
export class QueryFilter {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ enum: FilterOperator })
  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @ApiProperty()
  value: unknown;
}

// Aggregation definition
export class QueryAggregation {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ enum: AggregationFunction })
  @IsEnum(AggregationFunction)
  function: AggregationFunction;

  @ApiProperty()
  @IsString()
  alias: string;
}

// Order by definition
export class QueryOrderBy {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty({ enum: ['asc', 'desc'] })
  direction: 'asc' | 'desc';
}

// Time range definition
export class TimeRange {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  end?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preset?: string; // 'last_7_days', 'last_30_days', 'this_month', 'this_year'
}

// Data query definition
export class DataQueryDto {
  @ApiPropertyOptional({ enum: DataSourceType })
  @IsOptional()
  @IsEnum(DataSourceType)
  source?: DataSourceType;

  @ApiPropertyOptional({ type: [QueryFilter] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryFilter)
  filters?: QueryFilter[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiPropertyOptional({ type: [QueryAggregation] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryAggregation)
  aggregations?: QueryAggregation[];

  @ApiPropertyOptional({ type: QueryOrderBy })
  @IsOptional()
  @ValidateNested()
  @Type(() => QueryOrderBy)
  orderBy?: QueryOrderBy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ type: TimeRange })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRange)
  timeRange?: TimeRange;

  @ApiPropertyOptional({ description: 'Raw SQL for advanced users' })
  @IsOptional()
  @IsString()
  rawQuery?: string;
}

// Widget position
export class WidgetPosition {
  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;

  @ApiProperty()
  @IsNumber()
  w: number;

  @ApiProperty()
  @IsNumber()
  h: number;
}

// Widget configuration
export class WidgetConfigDto {
  @ApiPropertyOptional({ description: 'Colors for chart segments' })
  @IsOptional()
  colors?: string[];

  @ApiPropertyOptional({ description: 'Threshold values for KPIs' })
  @IsOptional()
  thresholds?: { value: number; color: string }[];

  @ApiPropertyOptional({ description: 'X-axis field for bar/line charts' })
  @IsOptional()
  @IsString()
  xAxisField?: string;

  @ApiPropertyOptional({ description: 'Y-axis field for bar/line charts' })
  @IsOptional()
  @IsString()
  yAxisField?: string;

  @ApiPropertyOptional({ description: 'Chart orientation' })
  @IsOptional()
  orientation?: 'horizontal' | 'vertical';

  @ApiPropertyOptional({ description: 'Table columns configuration' })
  @IsOptional()
  columns?: { field: string; header: string; width?: number }[];

  @ApiPropertyOptional({ description: 'Page size for tables' })
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Markdown content' })
  @IsOptional()
  @IsString()
  markdownContent?: string;

  @ApiPropertyOptional({ description: 'IFrame URL' })
  @IsOptional()
  @IsString()
  iframeUrl?: string;

  @ApiPropertyOptional({ description: 'Show legend' })
  @IsOptional()
  @IsBoolean()
  showLegend?: boolean;

  @ApiPropertyOptional({ description: 'Show values on chart' })
  @IsOptional()
  @IsBoolean()
  showValues?: boolean;

  @ApiPropertyOptional({ description: 'Metric field for KPI cards' })
  @IsOptional()
  @IsString()
  metricField?: string;

  @ApiPropertyOptional({ description: 'Comparison period for KPI cards' })
  @IsOptional()
  @IsString()
  comparisonPeriod?: string;

  @ApiPropertyOptional({ description: 'Target value for progress/gauge' })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({ description: 'Maximum value for gauge' })
  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @ApiPropertyOptional({ description: 'Format string for values' })
  @IsOptional()
  @IsString()
  valueFormat?: string;

  @ApiPropertyOptional({ description: 'Link template for clickable items' })
  @IsOptional()
  @IsString()
  linkTemplate?: string;
}

// Create widget DTO
export class CreateWidgetDto {
  @ApiProperty({ enum: WidgetType })
  @IsEnum(WidgetType)
  widgetType: WidgetType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ type: WidgetConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetConfigDto)
  config?: WidgetConfigDto;

  @ApiPropertyOptional({ type: DataQueryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DataQueryDto)
  dataSource?: DataQueryDto;

  @ApiPropertyOptional({ type: WidgetPosition })
  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetPosition)
  position?: WidgetPosition;

  @ApiPropertyOptional({ description: 'Auto-refresh rate in seconds' })
  @IsOptional()
  @IsNumber()
  refreshRate?: number;
}

// Update widget DTO
export class UpdateWidgetDto {
  @ApiPropertyOptional({ enum: WidgetType })
  @IsOptional()
  @IsEnum(WidgetType)
  widgetType?: WidgetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ type: WidgetConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetConfigDto)
  config?: WidgetConfigDto;

  @ApiPropertyOptional({ type: DataQueryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DataQueryDto)
  dataSource?: DataQueryDto;

  @ApiPropertyOptional({ type: WidgetPosition })
  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetPosition)
  position?: WidgetPosition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  refreshRate?: number;
}

// Create dashboard DTO
export class CreateDashboardDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Grid layout configuration' })
  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [CreateWidgetDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWidgetDto)
  widgets?: CreateWidgetDto[];
}

// Update dashboard DTO
export class UpdateDashboardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [CreateWidgetDto], description: 'Replace all widgets' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWidgetDto)
  widgets?: CreateWidgetDto[];
}

// Execute query DTO
export class ExecuteQueryDto {
  @ApiProperty({ type: DataQueryDto })
  @ValidateNested()
  @Type(() => DataQueryDto)
  query: DataQueryDto;

  @ApiPropertyOptional({ description: 'Preview mode limits results' })
  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}

// Dashboard response
export class DashboardResponseDto {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  isDefault: boolean;
  layout: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  widgets: WidgetResponseDto[];
}

// Widget response
export class WidgetResponseDto {
  id: string;
  widgetType: string;
  title: string;
  config: Record<string, unknown>;
  dataSource: Record<string, unknown>;
  position: Record<string, unknown>;
  refreshRate: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Data source definition response
export class DataSourceDefinitionDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  type: DataSourceType;

  @ApiProperty()
  fields: {
    name: string;
    type: string;
    label: string;
    filterable: boolean;
    aggregatable: boolean;
  }[];
}

