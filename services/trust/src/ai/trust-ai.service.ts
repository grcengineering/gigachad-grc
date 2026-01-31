import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import axios from 'axios';

export interface AnswerSuggestion {
  suggestedAnswer: string;
  confidence: number; // 0-100
  sources: { id: string; title: string; relevance: number }[];
  reasoning?: string;
}

export interface QuestionCategorization {
  category: string;
  confidence: number;
  suggestedTags: string[];
}

interface AiParsedResult {
  suggestedAnswer: string;
  confidence: number;
  relevantKbIndices: number[];
  reasoning: string;
}

interface KnowledgeBaseEntryForSearch {
  id: string;
  title: string;
  question: string | null;
  answer: string | null;
  category: string | null;
  tags: string[];
  usageCount: number;
}

interface KnowledgeBaseEntryWithScore extends KnowledgeBaseEntryForSearch {
  relevanceScore: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

@Injectable()
export class TrustAiService {
  private readonly logger = new Logger(TrustAiService.name);
  private readonly controlsServiceUrl = process.env.CONTROLS_SERVICE_URL || 'http://localhost:3001';

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Check if AI is enabled for the organization
  async isAiEnabled(organizationId: string): Promise<boolean> {
    const config = await this.prisma.trustConfiguration.findUnique({
      where: { organizationId },
    });

    if (!config) return false;
    
    const aiSettings = config.aiSettings as { enabled?: boolean } | null;
    return aiSettings?.enabled === true;
  }

  // Generate an AI-drafted answer based on question and knowledge base
  async generateAnswerDraft(
    organizationId: string,
    questionText: string,
    userId: string,
  ): Promise<AnswerSuggestion> {
    // Check if AI is enabled
    const enabled = await this.isAiEnabled(organizationId);
    if (!enabled) {
      throw new Error('AI features are not enabled for this organization');
    }

    // Search knowledge base for relevant entries
    const kbEntries = await this.prisma.knowledgeBaseEntry.findMany({
      where: {
        organizationId,
        status: 'approved',
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        question: true,
        answer: true,
        category: true,
        tags: true,
        usageCount: true,
      },
      orderBy: { usageCount: 'desc' },
      take: 20, // Get top KB entries for context
    });

    // Prepare context from KB entries
    const kbContext = kbEntries.map((entry, index) => 
      `[${index + 1}] Title: ${entry.title}\nQ: ${entry.question || 'N/A'}\nA: ${entry.answer || 'N/A'}`
    ).join('\n\n');

    // Build prompt for AI
    const prompt = `You are a trust and compliance expert helping to answer customer security questionnaires.

Based on the following knowledge base entries from our organization:

${kbContext}

Please draft an answer to this customer question:
"${questionText}"

Requirements:
1. Be professional, accurate, and concise
2. Reference our actual policies and practices from the knowledge base
3. If the knowledge base doesn't contain relevant information, indicate what areas might need clarification
4. Use a confident but not overpromising tone

Provide your response in the following JSON format:
{
  "suggestedAnswer": "Your drafted answer here",
  "confidence": 75,
  "relevantKbIndices": [1, 3, 5],
  "reasoning": "Brief explanation of how you constructed this answer"
}`;

    try {
      // Call the controls service AI endpoint
      const response = await axios.post(`${this.controlsServiceUrl}/ai/analyze`, {
        content: prompt,
        analysisType: 'questionnaire_response',
        options: {
          returnJson: true,
        },
      }, {
        headers: {
          'x-user-id': userId,
          'x-organization-id': organizationId,
        },
        timeout: 60000,
      });

      const aiResult = response.data;

      // Parse the AI response
      let parsedResult: AiParsedResult;
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiResult.analysis?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]) as AiParsedResult;
        } else {
          // Fallback: use the raw analysis as the answer
          parsedResult = {
            suggestedAnswer: aiResult.analysis || 'Unable to generate suggestion',
            confidence: 50,
            relevantKbIndices: [],
            reasoning: 'AI response did not include structured data',
          };
        }
      } catch {
        parsedResult = {
          suggestedAnswer: aiResult.analysis || 'Unable to generate suggestion',
          confidence: 50,
          relevantKbIndices: [],
          reasoning: 'AI response parsing failed',
        };
      }

      // Map KB indices to actual entries
      const sources = (parsedResult.relevantKbIndices || [])
        .filter((idx: number) => idx > 0 && idx <= kbEntries.length)
        .map((idx: number) => {
          const entry = kbEntries[idx - 1];
          return {
            id: entry.id,
            title: entry.title,
            relevance: 80, // Default relevance score
          };
        });

      // Log the AI usage
      await this.audit.log({
        organizationId,
        userId,
        action: 'AI_ANSWER_DRAFT',
        entityType: 'questionnaire_question',
        entityId: 'ai-draft',
        entityName: 'AI Answer Draft',
        description: `Generated AI answer draft for question`,
        metadata: {
          questionPreview: questionText.slice(0, 100),
          confidence: parsedResult.confidence,
          sourceCount: sources.length,
        },
      });

      return {
        suggestedAnswer: parsedResult.suggestedAnswer,
        confidence: parsedResult.confidence || 50,
        sources,
        reasoning: parsedResult.reasoning,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`AI answer generation failed: ${errorMessage}`, getErrorStack(error));
      
      // Return a fallback response with relevant KB entries
      const relevantEntries = this.findRelevantEntries(questionText, kbEntries);
      
      if (relevantEntries.length > 0) {
        return {
          suggestedAnswer: `Based on our knowledge base:\n\n${relevantEntries[0].answer || 'No answer available'}`,
          confidence: 30,
          sources: relevantEntries.slice(0, 3).map(e => ({
            id: e.id,
            title: e.title,
            relevance: 60,
          })),
          reasoning: 'AI service unavailable - showing best matching KB entry',
        };
      }

      throw new Error(`AI answer generation failed: ${errorMessage}`);
    }
  }

  // Categorize a question using AI
  async categorizeQuestion(
    organizationId: string,
    questionText: string,
    userId: string,
  ): Promise<QuestionCategorization> {
    const enabled = await this.isAiEnabled(organizationId);
    if (!enabled) {
      throw new Error('AI features are not enabled for this organization');
    }

    const prompt = `Categorize the following security questionnaire question into one of these categories:
- security: Questions about security controls, encryption, access management
- privacy: Questions about data privacy, GDPR, personal data handling
- compliance: Questions about regulatory compliance, audits, certifications
- legal: Questions about contracts, liability, legal agreements
- technical: Questions about infrastructure, architecture, integrations
- general: General questions that don't fit other categories

Question: "${questionText}"

Respond in JSON format:
{
  "category": "security",
  "confidence": 85,
  "suggestedTags": ["encryption", "access-control"]
}`;

    try {
      const response = await axios.post(`${this.controlsServiceUrl}/ai/analyze`, {
        content: prompt,
        analysisType: 'categorization',
        options: { returnJson: true },
      }, {
        headers: {
          'x-user-id': userId,
          'x-organization-id': organizationId,
        },
        timeout: 30000,
      });

      const jsonMatch = response.data.analysis?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as { category?: string; confidence?: number; suggestedTags?: string[] };
        return {
          category: result.category || 'general',
          confidence: result.confidence || 50,
          suggestedTags: result.suggestedTags || [],
        };
      }
    } catch (error: unknown) {
      this.logger.error(`AI categorization failed: ${getErrorMessage(error)}`);
    }

    // Fallback: simple keyword-based categorization
    return this.fallbackCategorization(questionText);
  }

  // Improve an existing answer using AI
  async improveAnswer(
    organizationId: string,
    questionText: string,
    currentAnswer: string,
    userId: string,
  ): Promise<AnswerSuggestion> {
    const enabled = await this.isAiEnabled(organizationId);
    if (!enabled) {
      throw new Error('AI features are not enabled for this organization');
    }

    const prompt = `As a trust and compliance expert, improve the following answer to a security questionnaire question.

Question: "${questionText}"

Current Answer: "${currentAnswer}"

Please improve this answer by:
1. Making it more professional and clear
2. Ensuring accuracy and completeness
3. Adding any missing important details
4. Maintaining a confident but appropriate tone

Respond in JSON format:
{
  "suggestedAnswer": "Your improved answer",
  "improvements": ["List of improvements made"],
  "confidence": 80
}`;

    try {
      const response = await axios.post(`${this.controlsServiceUrl}/ai/analyze`, {
        content: prompt,
        analysisType: 'answer_improvement',
        options: { returnJson: true },
      }, {
        headers: {
          'x-user-id': userId,
          'x-organization-id': organizationId,
        },
        timeout: 60000,
      });

      const jsonMatch = response.data.analysis?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as { suggestedAnswer?: string; confidence?: number; improvements?: string[] };
        return {
          suggestedAnswer: result.suggestedAnswer || currentAnswer,
          confidence: result.confidence || 60,
          sources: [],
          reasoning: result.improvements?.join(', ') || 'Answer improved for clarity and completeness',
        };
      }
    } catch (error: unknown) {
      this.logger.error(`AI answer improvement failed: ${getErrorMessage(error)}`);
    }

    return {
      suggestedAnswer: currentAnswer,
      confidence: 0,
      sources: [],
      reasoning: 'AI improvement unavailable',
    };
  }

  // Simple keyword-based relevance matching
  private findRelevantEntries(questionText: string, entries: KnowledgeBaseEntryForSearch[]): KnowledgeBaseEntryWithScore[] {
    const questionWords = questionText.toLowerCase().split(/\s+/);
    
    return entries
      .map(entry => {
        let score = 0;
        const entryText = `${entry.title} ${entry.question || ''} ${entry.answer || ''}`.toLowerCase();
        
        questionWords.forEach(word => {
          if (word.length > 3 && entryText.includes(word)) {
            score += 1;
          }
        });

        return { ...entry, relevanceScore: score };
      })
      .filter(e => e.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Fallback categorization without AI
  private fallbackCategorization(questionText: string): QuestionCategorization {
    const text = questionText.toLowerCase();
    
    const categories: Record<string, string[]> = {
      security: ['security', 'encrypt', 'password', 'access', 'authentication', 'firewall', 'vulnerability', 'penetration', 'soc 2', 'soc2'],
      privacy: ['privacy', 'gdpr', 'ccpa', 'personal data', 'pii', 'data subject', 'consent', 'retention'],
      compliance: ['compliance', 'audit', 'certification', 'iso', 'hipaa', 'pci', 'regulation', 'standard'],
      legal: ['legal', 'contract', 'liability', 'indemnity', 'agreement', 'terms', 'warranty'],
      technical: ['api', 'integration', 'infrastructure', 'architecture', 'cloud', 'aws', 'azure', 'database'],
    };

    let bestCategory = 'general';
    let bestScore = 0;
    const suggestedTags: string[] = [];

    for (const [category, keywords] of Object.entries(categories)) {
      let score = 0;
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score += 1;
          if (!suggestedTags.includes(keyword)) {
            suggestedTags.push(keyword);
          }
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return {
      category: bestCategory,
      confidence: bestScore > 0 ? Math.min(40 + bestScore * 15, 80) : 20,
      suggestedTags: suggestedTags.slice(0, 5),
    };
  }
}

