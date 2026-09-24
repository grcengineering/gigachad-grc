import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateQuestionnaireDto } from './questionnaires/dto/create-questionnaire.dto';
import { CreateKnowledgeBaseDto } from './knowledge-base/dto/create-knowledge-base.dto';

describe('Trust create DTO enum validation', () => {
  it('rejects questionnaire status and priority values outside the database enums', async () => {
    const dto = plainToInstance(CreateQuestionnaireDto, {
      requesterName: 'Requester',
      requesterEmail: 'requester@example.com',
      title: 'Questionnaire',
      status: 'draft',
      priority: 'eventually',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['status', 'priority'])
    );
  });

  it('rejects knowledge-base category and status values outside the database enums', async () => {
    const dto = plainToInstance(CreateKnowledgeBaseDto, {
      category: 'Security',
      title: 'Entry',
      answer: 'Answer',
      status: 'published',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['category', 'status'])
    );
  });

  it('accepts valid questionnaire and knowledge-base enum values', async () => {
    const questionnaire = plainToInstance(CreateQuestionnaireDto, {
      requesterName: 'Requester',
      requesterEmail: 'requester@example.com',
      title: 'Questionnaire',
      status: 'pending',
      priority: 'medium',
    });
    const knowledgeEntry = plainToInstance(CreateKnowledgeBaseDto, {
      category: 'security',
      title: 'Entry',
      answer: 'Answer',
      status: 'approved',
    });

    expect(await validate(questionnaire)).toHaveLength(0);
    expect(await validate(knowledgeEntry)).toHaveLength(0);
  });
});
