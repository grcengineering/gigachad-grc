import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  async globalSearch(@Query('q') query: string) {
    // Type validation: ensure query is a string (not an array from multiple query params)
    if (typeof query !== 'string' || query.length < 2) {
      return { data: [] };
    }

    const results = await this.searchService.searchAll(query);
    return { data: results };
  }
}
