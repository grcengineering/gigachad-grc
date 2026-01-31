import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AIProvider,
  OpenAIProvider,
  AnthropicProvider,
  MockAIProvider,
} from './providers';
import {
  AIProvider as AIProviderEnum,
  AIConfigDto,
  UpdateAIConfigDto,
  RiskScoringRequestDto,
  RiskScoringResponseDto,
  CategorizationRequestDto,
  CategorizationResponseDto,
  EntityType,
  SmartSearchRequestDto,
  SmartSearchResponseDto,
  PolicyDraftRequestDto,
  PolicyDraftResponseDto,
  ControlSuggestionRequestDto,
  ControlSuggestionResponseDto,
} from './dto/ai.dto';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private providers: Map<string, AIProvider> = new Map();
  private mockModeEnabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    // Initialize providers
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('mock', new MockAIProvider());

    // Check if mock mode is explicitly enabled or if no real providers are configured
    this.mockModeEnabled = process.env.AI_MOCK_MODE === 'true';

    if (this.mockModeEnabled) {
      this.logger.log('AI Mock Mode explicitly enabled via AI_MOCK_MODE=true');
    } else {
      // Check if any real provider is configured
      const openaiConfigured = this.providers.get('openai')?.isConfigured() ?? false;
      const anthropicConfigured = this.providers.get('anthropic')?.isConfigured() ?? false;
      
      if (!openaiConfigured && !anthropicConfigured) {
        this.logger.warn(
          'No AI API keys configured (OPENAI_API_KEY or ANTHROPIC_API_KEY). ' +
          'Falling back to Mock AI Provider for testing/demo purposes.'
        );
        this.mockModeEnabled = true;
      }
    }
  }

  /**
   * Check if the service is running in mock mode
   */
  isMockMode(): boolean {
    return this.mockModeEnabled;
  }

  /**
   * Get the active provider name (for status reporting)
   */
  getActiveProviderName(): string {
    if (this.mockModeEnabled) return 'mock';
    const openaiConfigured = this.providers.get('openai')?.isConfigured() ?? false;
    if (openaiConfigured) return 'openai';
    const anthropicConfigured = this.providers.get('anthropic')?.isConfigured() ?? false;
    if (anthropicConfigured) return 'anthropic';
    return 'mock';
  }

  // ============================================
  // Configuration Management
  // ============================================

  async getConfig(organizationId: string): Promise<AIConfigDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    
    return {
      provider: (settings.aiProvider as AIProviderEnum) || AIProviderEnum.OPENAI,
      model: (settings.aiModel as string) || 'gpt-4o',
      enabled: (settings.aiEnabled as boolean) ?? true,
      temperature: (settings.aiTemperature as number) ?? 0.7,
      maxTokens: (settings.aiMaxTokens as number) ?? 4096,
    };
  }

  async updateConfig(organizationId: string, dto: UpdateAIConfigDto): Promise<AIConfigDto> {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const oldSettings = (existing?.settings as Record<string, unknown>) || {};
    
    const newSettings = {
      ...oldSettings,
      ...(dto.provider !== undefined && { aiProvider: dto.provider }),
      ...(dto.model !== undefined && { aiModel: dto.model }),
      ...(dto.enabled !== undefined && { aiEnabled: dto.enabled }),
      ...(dto.temperature !== undefined && { aiTemperature: dto.temperature }),
      ...(dto.maxTokens !== undefined && { aiMaxTokens: dto.maxTokens }),
    };

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: newSettings },
    });

    return this.getConfig(organizationId);
  }

  async getProviderStatus(organizationId: string): Promise<{
    provider: string;
    isConfigured: boolean;
    availableModels: string[];
    isMockMode: boolean;
    mockModeReason?: string;
  }> {
    const config = await this.getConfig(organizationId);
    
    // Check if we're in mock mode
    if (this.mockModeEnabled) {
      const mockProvider = this.providers.get('mock')!;
      const reason = process.env.AI_MOCK_MODE === 'true'
        ? 'Mock mode explicitly enabled via AI_MOCK_MODE environment variable'
        : 'No AI API keys configured (OPENAI_API_KEY or ANTHROPIC_API_KEY not set)';
      
      return {
        provider: 'mock',
        isConfigured: true,
        availableModels: mockProvider.getAvailableModels(),
        isMockMode: true,
        mockModeReason: reason,
      };
    }

    const provider = this.providers.get(config.provider);
    const isConfigured = provider?.isConfigured() ?? false;

    // If configured provider isn't set up, report that we'll fall back to mock
    if (!isConfigured) {
      const mockProvider = this.providers.get('mock')!;
      return {
        provider: config.provider,
        isConfigured: false,
        availableModels: mockProvider.getAvailableModels(),
        isMockMode: true,
        mockModeReason: `${config.provider} API key not configured. Mock mode will be used.`,
      };
    }

    return {
      provider: config.provider,
      isConfigured: true,
      availableModels: provider?.getAvailableModels() ?? [],
      isMockMode: false,
    };
  }

  // ============================================
  // Provider Access
  // ============================================

  private async getActiveProvider(organizationId: string): Promise<AIProvider> {
    const config = await this.getConfig(organizationId);
    
    if (!config.enabled) {
      throw new BadRequestException('AI features are disabled for this organization');
    }

    // If mock mode is enabled (explicitly or due to no API keys), use mock provider
    if (this.mockModeEnabled) {
      this.logger.debug('Using Mock AI Provider (mock mode enabled)');
      return this.providers.get('mock')!;
    }

    // Try to use the configured provider
    const provider = this.providers.get(config.provider);
    
    if (!provider) {
      throw new BadRequestException(`Unknown AI provider: ${config.provider}`);
    }

    // If configured provider isn't set up, fall back to mock
    if (!provider.isConfigured()) {
      this.logger.warn(
        `AI provider ${config.provider} is not configured. Falling back to Mock provider.`
      );
      return this.providers.get('mock')!;
    }

    return provider;
  }

  // ============================================
  // Risk Scoring
  // ============================================

  async analyzeRisk(
    organizationId: string,
    dto: RiskScoringRequestDto
  ): Promise<RiskScoringResponseDto> {
    const provider = await this.getActiveProvider(organizationId);
    const config = await this.getConfig(organizationId);

    const systemPrompt = `You are a GRC (Governance, Risk, and Compliance) expert assistant. 
You analyze risks and provide structured assessments based on industry best practices.
Consider the organization's context, existing controls, and industry-specific factors.
Your assessments should be well-reasoned and actionable.`;

    const prompt = `Analyze the following risk and provide a detailed assessment:

Risk Title: ${dto.title}
Risk Description: ${dto.description}
${dto.category ? `Category: ${dto.category}` : ''}
${dto.affectedAssets?.length ? `Affected Assets: ${dto.affectedAssets.join(', ')}` : ''}
${dto.existingControls?.length ? `Existing Controls: ${dto.existingControls.join(', ')}` : ''}
${dto.industryContext ? `Industry Context: ${dto.industryContext}` : ''}

Provide your assessment with:
1. Likelihood score (1-5, where 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain)
2. Impact score (1-5, where 1=Negligible, 2=Minor, 3=Moderate, 4=Major, 5=Severe)
3. Detailed rationale for each score
4. Suggested category if not provided
5. Recommended controls to mitigate this risk
6. Your confidence level in this assessment (0-100)`;

    const schema = `{
  "likelihood": number (1-5),
  "impact": number (1-5),
  "riskScore": number (1-25, likelihood * impact),
  "riskLevel": string ("Low" | "Medium" | "High" | "Critical"),
  "likelihoodRationale": string,
  "impactRationale": string,
  "suggestedCategory": string,
  "recommendedControls": string[],
  "confidence": number (0-100)
}`;

    try {
      const result = await provider.generateJSON<RiskScoringResponseDto>(
        prompt,
        systemPrompt,
        schema,
        { model: config.model, temperature: config.temperature, maxTokens: config.maxTokens }
      );

      // Calculate risk score and level if not provided correctly
      result.riskScore = result.likelihood * result.impact;
      result.riskLevel = this.calculateRiskLevel(result.riskScore);

      this.logger.log(`Risk analysis completed for org ${organizationId}`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Risk analysis failed: ${message}`);
      throw error;
    }
  }

  private calculateRiskLevel(score: number): string {
    if (score <= 4) return 'Low';
    if (score <= 9) return 'Medium';
    if (score <= 16) return 'High';
    return 'Critical';
  }

  // ============================================
  // Auto-Categorization
  // ============================================

  async categorize(
    organizationId: string,
    dto: CategorizationRequestDto
  ): Promise<CategorizationResponseDto> {
    const provider = await this.getActiveProvider(organizationId);
    const config = await this.getConfig(organizationId);

    const categoryMappings = this.getCategoryMappings(dto.entityType);

    const systemPrompt = `You are a GRC expert assistant that categorizes security and compliance entities.
You understand various compliance frameworks (SOC 2, ISO 27001, NIST CSF, HIPAA, PCI-DSS, GDPR).
Provide accurate categorization based on the entity's purpose and content.`;

    const prompt = `Categorize the following ${dto.entityType}:

Title: ${dto.title}
Description: ${dto.description}
${dto.additionalContext ? `Additional Context: ${dto.additionalContext}` : ''}

Available categories for ${dto.entityType}:
${categoryMappings.join('\n')}

Provide:
1. The most appropriate primary category
2. A subcategory if applicable
3. Relevant tags (3-5)
4. Related compliance framework requirements
5. Confidence level (0-100)
6. Brief explanation of your categorization`;

    const schema = `{
  "primaryCategory": string,
  "subcategory": string,
  "tags": string[],
  "relatedFrameworks": string[],
  "confidence": number (0-100),
  "explanation": string
}`;

    try {
      const result = await provider.generateJSON<CategorizationResponseDto>(
        prompt,
        systemPrompt,
        schema,
        { model: config.model, temperature: 0.3, maxTokens: config.maxTokens }
      );

      this.logger.log(`Categorization completed for org ${organizationId}`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Categorization failed: ${message}`);
      throw error;
    }
  }

  private getCategoryMappings(entityType: EntityType): string[] {
    const mappings: Record<EntityType, string[]> = {
      [EntityType.CONTROL]: [
        'Access Control', 'Asset Management', 'Business Continuity',
        'Cryptography', 'Human Resources Security', 'Incident Management',
        'Network Security', 'Operations Security', 'Physical Security',
        'Risk Management', 'Supplier Relationships', 'System Development',
      ],
      [EntityType.RISK]: [
        'Operational', 'Strategic', 'Financial', 'Compliance',
        'Security', 'Technical', 'Third-Party', 'Reputational',
      ],
      [EntityType.POLICY]: [
        'Information Security', 'Access Control', 'Data Protection',
        'Acceptable Use', 'Incident Response', 'Business Continuity',
        'Risk Management', 'Vendor Management', 'Human Resources',
      ],
      [EntityType.EVIDENCE]: [
        'Policy Document', 'Procedure', 'Screenshot', 'Configuration',
        'Report', 'Log', 'Certificate', 'Training Record', 'Audit Report',
      ],
      [EntityType.VENDOR]: [
        'Cloud Provider', 'SaaS', 'Infrastructure', 'Security',
        'Professional Services', 'Data Processing', 'Software',
      ],
    };

    return mappings[entityType] || [];
  }

  // ============================================
  // Smart Search
  // ============================================

  async smartSearch(
    organizationId: string,
    dto: SmartSearchRequestDto
  ): Promise<SmartSearchResponseDto> {
    const provider = await this.getActiveProvider(organizationId);
    const config = await this.getConfig(organizationId);
    
    const limit = dto.limit || 10;
    const entityTypes = dto.entityTypes || Object.values(EntityType);

    // Gather data from the database to search through
    const searchData = await this.gatherSearchData(organizationId, entityTypes, 50);

    const systemPrompt = `You are a GRC search assistant. You help users find relevant items across controls, risks, policies, evidence, and vendors.
Interpret the user's natural language query and find the most relevant items from the provided data.
Consider semantic meaning, not just keyword matching.`;

    const prompt = `User Query: "${dto.query}"

Available Data:
${JSON.stringify(searchData, null, 2)}

Find the ${limit} most relevant items that match the user's query. Consider:
- Semantic relevance (what the user is really looking for)
- Direct keyword matches
- Related concepts

For each result, explain why it's relevant and provide a relevance score (0-100).`;

    const schema = `{
  "results": [
    {
      "entityType": string,
      "id": string,
      "title": string,
      "relevance": number (0-100),
      "snippet": string (brief excerpt showing relevance),
      "explanation": string (why this result is relevant)
    }
  ],
  "interpretation": string (how you interpreted the query),
  "suggestedRefinements": string[] (suggested ways to refine the search),
  "totalMatches": number
}`;

    try {
      const result = await provider.generateJSON<SmartSearchResponseDto>(
        prompt,
        systemPrompt,
        schema,
        { model: config.model, temperature: 0.3, maxTokens: config.maxTokens }
      );

      this.logger.log(`Smart search completed for org ${organizationId}`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Smart search failed: ${message}`);
      throw error;
    }
  }

  private async gatherSearchData(
    organizationId: string,
    entityTypes: EntityType[],
    limit: number
  ): Promise<Record<string, Array<{ id: string; title: string; description: string }>>> {
    const data: Record<string, Array<{ id: string; title: string; description: string }>> = {};

    if (entityTypes.includes(EntityType.CONTROL)) {
      const controls = await this.prisma.control.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, title: true, description: true },
        take: limit,
      });
      data.controls = controls.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description || '',
      }));
    }

    if (entityTypes.includes(EntityType.RISK)) {
      const risks = await this.prisma.risk.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, title: true, description: true },
        take: limit,
      });
      data.risks = risks.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
      }));
    }

    if (entityTypes.includes(EntityType.POLICY)) {
      const policies = await this.prisma.policy.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, title: true, description: true },
        take: limit,
      });
      data.policies = policies.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
      }));
    }

    if (entityTypes.includes(EntityType.EVIDENCE)) {
      const evidence = await this.prisma.evidence.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, title: true, description: true },
        take: limit,
      });
      data.evidence = evidence.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
      }));
    }

    if (entityTypes.includes(EntityType.VENDOR)) {
      const vendors = await this.prisma.vendor.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, name: true, description: true },
        take: limit,
      });
      data.vendors = vendors.map(v => ({
        id: v.id,
        title: v.name,
        description: v.description || '',
      }));
    }

    return data;
  }

  // ============================================
  // Policy Drafting
  // ============================================

  async draftPolicy(
    organizationId: string,
    dto: PolicyDraftRequestDto
  ): Promise<PolicyDraftResponseDto> {
    const provider = await this.getActiveProvider(organizationId);
    const config = await this.getConfig(organizationId);

    const systemPrompt = `You are an expert policy writer for information security and compliance.
You create professional, comprehensive policy documents that meet regulatory requirements.
Your policies are clear, actionable, and suitable for enterprise organizations.`;

    const prompt = `Draft a ${dto.policyType} for ${dto.organizationName}.

${dto.industry ? `Industry: ${dto.industry}` : ''}
${dto.frameworks?.length ? `Compliance Frameworks to Address: ${dto.frameworks.join(', ')}` : ''}
${dto.requirements?.length ? `Specific Requirements to Include:\n${dto.requirements.map(r => `- ${r}`).join('\n')}` : ''}
${dto.additionalContext ? `Additional Context: ${dto.additionalContext}` : ''}
${dto.tone ? `Desired Tone: ${dto.tone}` : 'Tone: Professional and formal'}

Create a comprehensive policy with:
1. A clear title
2. Full policy content in markdown format with proper sections
3. A list of all sections with their content
4. Framework requirements addressed
5. Suggested review schedule
6. Related policies that should be considered`;

    const schema = `{
  "title": string,
  "content": string (full policy in markdown),
  "sections": [
    {
      "title": string,
      "content": string,
      "order": number
    }
  ],
  "frameworksCovered": string[],
  "suggestedReviewSchedule": string,
  "relatedPolicies": string[]
}`;

    try {
      const result = await provider.generateJSON<PolicyDraftResponseDto>(
        prompt,
        systemPrompt,
        schema,
        { model: config.model, temperature: 0.7, maxTokens: 8192 }
      );

      this.logger.log(`Policy draft completed for org ${organizationId}`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Policy drafting failed: ${message}`);
      throw error;
    }
  }

  // ============================================
  // Control Suggestions
  // ============================================

  async suggestControls(
    organizationId: string,
    dto: ControlSuggestionRequestDto
  ): Promise<ControlSuggestionResponseDto> {
    const provider = await this.getActiveProvider(organizationId);
    const config = await this.getConfig(organizationId);

    const systemPrompt = `You are a GRC expert that recommends security controls.
You understand various compliance frameworks and security best practices.
Your recommendations are practical, prioritized, and include implementation guidance.`;

    let context = '';
    if (dto.riskDescription) {
      context += `Risk to Mitigate: ${dto.riskDescription}\n`;
    }
    if (dto.frameworkRequirement) {
      context += `Framework Requirement: ${dto.frameworkRequirement}\n`;
    }
    if (dto.framework) {
      context += `Framework: ${dto.framework}\n`;
    }
    if (dto.existingControls?.length) {
      context += `Existing Controls: ${dto.existingControls.join(', ')}\n`;
    }
    if (dto.organizationContext) {
      context += `Organization Context: ${dto.organizationContext}\n`;
    }

    const prompt = `Suggest security controls based on the following:

${context}

Provide:
1. 5-10 recommended controls with detailed information
2. Implementation guidance for each
3. Effort estimates (Low/Medium/High)
4. Effectiveness ratings (1-5)
5. Framework mappings
6. Priority order (1 being highest priority)
7. A gap analysis summary
8. An implementation roadmap
9. Total effort estimate`;

    const schema = `{
  "controls": [
    {
      "title": string,
      "description": string,
      "category": string,
      "implementationGuidance": string,
      "effortEstimate": string ("Low" | "Medium" | "High"),
      "effectivenessRating": number (1-5),
      "frameworkMappings": string[],
      "priority": number (1-10)
    }
  ],
  "gapAnalysis": string,
  "implementationRoadmap": string,
  "totalEffortEstimate": string
}`;

    try {
      const result = await provider.generateJSON<ControlSuggestionResponseDto>(
        prompt,
        systemPrompt,
        schema,
        { model: config.model, temperature: 0.5, maxTokens: config.maxTokens }
      );

      // Sort controls by priority
      result.controls.sort((a, b) => a.priority - b.priority);

      this.logger.log(`Control suggestions completed for org ${organizationId}`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Control suggestion failed: ${message}`);
      throw error;
    }
  }

  // ============================================
  // Generic Completion (for advanced use)
  // ============================================

  async complete(
    organizationId: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<{ content: string; tokensUsed: number; model: string }> {
    const provider = await this.getActiveProvider(organizationId);
    const config = await this.getConfig(organizationId);

    const result = await provider.generateText(
      prompt,
      systemPrompt,
      { model: config.model, temperature: config.temperature, maxTokens: config.maxTokens }
    );

    return {
      content: result.content,
      tokensUsed: result.tokensUsed.total,
      model: result.model,
    };
  }
}
