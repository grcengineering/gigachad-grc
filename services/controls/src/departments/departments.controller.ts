import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentDto,
  DepartmentTreeDto,
  AddDepartmentMemberDto,
  DepartmentMemberDto,
  CreateGroupHierarchyDto,
  GroupHierarchyDto,
  CreateGroupDepartmentScopeDto,
  GroupDepartmentScopeDto,
  EnhancedPermissionGroupDto,
} from './dto/department.dto';
import {
  CurrentUser,
  UserContext,
  Roles,
  RolesGuard,
} from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  @ApiResponse({ status: 200, type: [DepartmentDto] })
  async findAll(@CurrentUser() user: UserContext): Promise<DepartmentDto[]> {
    return this.departmentsService.findAll(user.organizationId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get department hierarchy tree' })
  @ApiResponse({ status: 200, type: [DepartmentTreeDto] })
  async getTree(@CurrentUser() user: UserContext): Promise<DepartmentTreeDto[]> {
    return this.departmentsService.getTree(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a department by ID' })
  @ApiResponse({ status: 200, type: DepartmentDto })
  async findOne(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<DepartmentDto> {
    return this.departmentsService.findOne(user.organizationId, id);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ status: 201, type: DepartmentDto })
  async create(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.departmentsService.create(user.organizationId, dto);
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update a department' })
  @ApiResponse({ status: 200, type: DepartmentDto })
  async update(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.departmentsService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a department' })
  @ApiResponse({ status: 200 })
  async delete(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.departmentsService.delete(user.organizationId, id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List department members' })
  @ApiResponse({ status: 200, type: [DepartmentMemberDto] })
  async getMembers(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<DepartmentMemberDto[]> {
    return this.departmentsService.getMembers(user.organizationId, id);
  }

  @Post(':id/members')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Add a member to department' })
  @ApiResponse({ status: 201, type: DepartmentMemberDto })
  async addMember(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: AddDepartmentMemberDto,
  ): Promise<DepartmentMemberDto> {
    return this.departmentsService.addMember(user.organizationId, id, dto);
  }

  @Delete(':id/members/:userId')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Remove a member from department' })
  @ApiResponse({ status: 200 })
  async removeMember(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.departmentsService.removeMember(user.organizationId, id, userId);
  }
}

@ApiTags('Permission Groups - Enhanced')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/permission-groups')
export class PermissionGroupsEnhancedController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get(':id/hierarchy')
  @ApiOperation({ summary: 'Get group parent/child hierarchy' })
  async getHierarchy(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<{ parents: GroupHierarchyDto[]; children: GroupHierarchyDto[] }> {
    return this.departmentsService.getGroupHierarchy(user.organizationId, id);
  }

  @Post('hierarchy')
  @Roles('admin')
  @ApiOperation({ summary: 'Create group hierarchy relationship' })
  @ApiResponse({ status: 201, type: GroupHierarchyDto })
  async createHierarchy(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateGroupHierarchyDto,
  ): Promise<GroupHierarchyDto> {
    return this.departmentsService.createGroupHierarchy(user.organizationId, dto);
  }

  @Delete('hierarchy')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove group hierarchy relationship' })
  @ApiQuery({ name: 'parentGroupId', required: true })
  @ApiQuery({ name: 'childGroupId', required: true })
  async deleteHierarchy(
    @CurrentUser() user: UserContext,
    @Query('parentGroupId') parentGroupId: string,
    @Query('childGroupId') childGroupId: string,
  ): Promise<void> {
    return this.departmentsService.deleteGroupHierarchy(
      user.organizationId,
      parentGroupId,
      childGroupId,
    );
  }

  @Get(':id/department-scopes')
  @ApiOperation({ summary: 'Get department scopes for a group' })
  @ApiResponse({ status: 200, type: [GroupDepartmentScopeDto] })
  async getDepartmentScopes(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<GroupDepartmentScopeDto[]> {
    return this.departmentsService.getGroupDepartmentScopes(user.organizationId, id);
  }

  @Post('department-scopes')
  @Roles('admin')
  @ApiOperation({ summary: 'Add department scope to group' })
  @ApiResponse({ status: 201, type: GroupDepartmentScopeDto })
  async createDepartmentScope(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateGroupDepartmentScopeDto,
  ): Promise<GroupDepartmentScopeDto> {
    return this.departmentsService.createGroupDepartmentScope(user.organizationId, dto);
  }

  @Delete('department-scopes')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove department scope from group' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'departmentId', required: true })
  async deleteDepartmentScope(
    @CurrentUser() user: UserContext,
    @Query('groupId') groupId: string,
    @Query('departmentId') departmentId: string,
  ): Promise<void> {
    return this.departmentsService.deleteGroupDepartmentScope(
      user.organizationId,
      groupId,
      departmentId,
    );
  }

  @Get(':id/enhanced')
  @ApiOperation({ summary: 'Get enhanced permission group with hierarchy and scopes' })
  @ApiResponse({ status: 200, type: EnhancedPermissionGroupDto })
  async getEnhanced(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<EnhancedPermissionGroupDto> {
    return this.departmentsService.getEnhancedPermissionGroup(
      user.organizationId,
      id,
    );
  }
}
