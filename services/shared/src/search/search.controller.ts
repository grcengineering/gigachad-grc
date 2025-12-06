import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  async globalSearch(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return { data: [] };
    }

    const results = await this.searchService.searchAll(query);
    return { data: results };
  }
}
