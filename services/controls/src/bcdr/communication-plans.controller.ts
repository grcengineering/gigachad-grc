import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CommunicationPlansService } from './communication-plans.service';
import {
  CreateCommunicationPlanDto,
  UpdateCommunicationPlanDto,
  CreateContactDto,
} from './dto/bcdr.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('bcdr/communication')
@ApiBearerAuth()
@Controller('api/bcdr/communication')
@UseGuards(DevAuthGuard)
export class CommunicationPlansController {
  constructor(private readonly communicationService: CommunicationPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List communication plans' })
  @ApiResponse({ status: 200, description: 'List of communication plans' })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query('search') search?: string,
    @Query('planType') planType?: string,
    @Query('bcdrPlanId') bcdrPlanId?: string
  ) {
    return this.communicationService.findAll(user.organizationId, { search, planType, bcdrPlanId });
  }

  @Get('escalation')
  @ApiOperation({ summary: 'Get contacts grouped by escalation level' })
  async getContactsByEscalation(
    @CurrentUser() user: UserContext,
    @Query('planId') planId?: string
  ) {
    return this.communicationService.getContactsByEscalation(user.organizationId, planId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get communication plan details' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.communicationService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a communication plan' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  async create(@CurrentUser() user: UserContext, @Body() dto: CreateCommunicationPlanDto) {
    return this.communicationService.create(
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a communication plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateCommunicationPlanDto
  ) {
    return this.communicationService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
      user.email,
      user.name
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a communication plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.communicationService.delete(
      id,
      user.organizationId,
      user.userId,
      user.email,
      user.name
    );
  }

  // Contacts
  @Post(':id/contacts')
  @ApiOperation({ summary: 'Add a contact to the plan' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async addContact(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: CreateContactDto
  ) {
    return this.communicationService.addContact(id, user.userId, dto);
  }

  @Put(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  async updateContact(
    @Param('contactId') contactId: string,
    @Body() updates: Partial<CreateContactDto> & { isActive?: boolean }
  ) {
    return this.communicationService.updateContact(contactId, updates);
  }

  @Delete(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  async deleteContact(@Param('contactId') contactId: string) {
    return this.communicationService.deleteContact(contactId);
  }

  @Put(':id/contacts/reorder')
  @ApiOperation({ summary: 'Reorder contacts' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  async reorderContacts(@Param('id') id: string, @Body() body: { contactIds: string[] }) {
    return this.communicationService.reorderContacts(id, body.contactIds);
  }
}
