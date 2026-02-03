import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookDto,
  WebhookDeliveryQueryDto,
  TestWebhookDto,
  TestWebhookResultDto,
} from './dto/webhook.dto';
import { CurrentUser, UserContext, Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  @ApiResponse({ status: 200, type: [WebhookDto] })
  async findAll(@CurrentUser() user: UserContext): Promise<WebhookDto[]> {
    return this.webhooksService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by ID' })
  @ApiResponse({ status: 200, type: WebhookDto })
  async findOne(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<WebhookDto> {
    return this.webhooksService.findOne(user.organizationId, id);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, type: WebhookDto })
  async create(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateWebhookDto,
  ): Promise<WebhookDto> {
    return this.webhooksService.create(user.organizationId, dto);
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiResponse({ status: 200, type: WebhookDto })
  async update(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ): Promise<WebhookDto> {
    return this.webhooksService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiResponse({ status: 200 })
  async delete(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.webhooksService.delete(user.organizationId, id);
  }

  @Post(':id/test')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Send a test event to webhook' })
  @ApiResponse({ status: 200, type: TestWebhookResultDto })
  async testWebhook(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: TestWebhookDto,
  ): Promise<TestWebhookResultDto> {
    return this.webhooksService.testWebhook(user.organizationId, id, dto);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  async getDeliveries(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Query() query: WebhookDeliveryQueryDto,
  ) {
    return this.webhooksService.getDeliveries(user.organizationId, id, query);
  }

  @Post(':webhookId/deliveries/:deliveryId/retry')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  @ApiResponse({ status: 200, type: TestWebhookResultDto })
  async retryDelivery(
    @CurrentUser() user: UserContext,
    @Param('webhookId') webhookId: string,
    @Param('deliveryId') deliveryId: string,
  ): Promise<TestWebhookResultDto> {
    return this.webhooksService.retryDelivery(user.organizationId, webhookId, deliveryId);
  }
}
