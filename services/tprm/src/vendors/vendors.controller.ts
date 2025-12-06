import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('vendors')
@UseGuards(DevAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  create(
    @Body() createVendorDto: CreateVendorDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.vendorsService.create(createVendorDto, user.userId);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('tier') tier?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.vendorsService.findAll({ category, tier, status, search });
  }

  @Get('dashboard-stats')
  getDashboardStats() {
    return this.vendorsService.getDashboardStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.vendorsService.update(id, updateVendorDto, user.userId);
  }

  @Patch(':id/risk-score')
  updateRiskScore(
    @Param('id') id: string,
    @Body('inherentRiskScore') inherentRiskScore: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.vendorsService.updateRiskScore(id, inherentRiskScore, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.vendorsService.remove(id, user.userId);
  }
}
