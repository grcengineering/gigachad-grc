import { Controller, Post, Get, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { SecurityScannerService } from './security-scanner.service';
import { PageCrawler } from './collectors/page-crawler';
import { InitiateSecurityScanDto } from './dto/security-scan.dto';
import { CurrentUser, UserContext, validateUrl } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('vendors/:vendorId/security-scan')
@UseGuards(DevAuthGuard)
export class SecurityScannerController {
  constructor(
    private readonly securityScannerService: SecurityScannerService,
    private readonly pageCrawler: PageCrawler
  ) {}

  /**
   * Initiate a new security scan for a vendor
   */
  @Post()
  async initiateScan(
    @Param('vendorId') vendorId: string,
    @Body() dto: InitiateSecurityScanDto,
    @CurrentUser() user: UserContext
  ) {
    return this.securityScannerService.initiateScan(vendorId, dto, user.userId);
  }

  /**
   * Get the latest security scan for a vendor
   */
  @Get('latest')
  async getLatestScan(@Param('vendorId') vendorId: string) {
    return this.securityScannerService.getLatestScan(vendorId);
  }

  /**
   * Get a specific security scan by ID
   */
  @Get(':scanId')
  async getScanById(@Param('vendorId') vendorId: string, @Param('scanId') scanId: string) {
    return this.securityScannerService.getScanById(vendorId, scanId);
  }

  /**
   * Get all security scans for a vendor
   */
  @Get('history')
  async getScanHistory(@Param('vendorId') vendorId: string) {
    return this.securityScannerService.getScanHistory(vendorId);
  }

  /**
   * Crawl a subdomain to discover pages and links
   */
  @Post('crawl-subdomain')
  async crawlSubdomain(@Param('vendorId') vendorId: string, @Body() dto: { subdomain: string }) {
    // SSRF Protection: Validate the URL before crawling
    // This prevents requests to internal networks, localhost, and private IP ranges
    const targetUrl = dto.subdomain.startsWith('http') ? dto.subdomain : `https://${dto.subdomain}`;

    const validation = await validateUrl(targetUrl, {
      allowPrivateIPs: false,
      allowedProtocols: ['http:', 'https:'],
      blockedHosts: [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        'metadata.google.internal',
        'metadata.azure.internal',
        '169.254.169.254', // AWS/GCP metadata endpoint
      ],
    });

    if (!validation.valid) {
      throw new BadRequestException(
        `URL validation failed: ${validation.error}. ` +
          'Requests to internal networks, localhost, and private IP ranges are not allowed.'
      );
    }

    return this.pageCrawler.crawl(dto.subdomain);
  }
}
