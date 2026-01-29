# Awareness Training

Manage security awareness training programs for your organization.

## Overview

Awareness Training helps you:
- Deliver security education
- Track training completion
- Manage training campaigns
- Report on compliance
- Meet regulatory requirements

## Training Programs

### Program Types
- **New Hire Training**: Onboarding security training
- **Annual Refresher**: Yearly awareness update
- **Role-Based**: Specialized training by role
- **Topic-Specific**: Focused training (phishing, data handling)
- **Compliance**: Regulatory-required training

## Viewing Programs

Navigate to **Tools → Awareness & Training**

### Program List
- **Name**: Program title
- **Type**: Training type
- **Status**: Active, Draft, Archived
- **Assigned**: Number assigned
- **Completion**: Completion rate

## Creating Programs

### Create Program
1. Click **Create Program**
2. Enter:
   - **Name**: Program title
   - **Description**: What it covers
   - **Type**: Program category
3. Add content:
   - Training modules
   - Videos
   - Documents
   - Quizzes
4. Configure settings:
   - Duration
   - Pass requirements
   - Retake policy
5. Click **Create**

### Training Content
Add training materials:
- Upload videos
- Create slides
- Add documents
- Build quizzes

## Assigning Training

### Assign to Employees
1. Open program
2. Click **Assign**
3. Select employees:
   - Individual selection
   - By department
   - By role
   - All employees
4. Set due date
5. Send notification

### Automatic Assignment
Configure rules:
- New hire auto-assignment
- Role-based auto-assignment
- Annual renewal auto-assignment

## Tracking Progress

### Completion Dashboard
View real-time status:
- Total assigned
- Completed
- In progress
- Overdue

### Individual Progress
Track per employee:
- Assigned programs
- Completion status
- Quiz scores
- Certificates earned

### Reminders
Automatic reminders:
- Before due date
- After due date
- Custom intervals

## Quizzes and Assessments

### Creating Quizzes
1. Go to program **Content** tab
2. Click **Add Quiz**
3. Add questions:
   - Multiple choice
   - True/false
   - Short answer
4. Set passing score
5. Save

### Taking Quizzes
Each training module includes a quiz to test comprehension:
1. Complete the module content
2. Click **Take Quiz**
3. Answer questions (randomized from question bank)
4. Submit answers
5. View results and explanations

### Quiz Results
Track quiz performance:
- Pass/fail rate (70% required to pass)
- Average score
- Common wrong answers
- Retake statistics

### Quiz API
Quizzes are available via API:
- `GET /api/training/modules/:moduleId/quiz` - Get randomized quiz questions
- `POST /api/training/modules/:moduleId/quiz/submit` - Submit answers and get results

## Certificates

### Certificate Generation
Upon completion:
- Automatic certificate generation
- Customizable template with organization branding
- Unique certificate ID for verification
- Valid for configurable period (default: 1 year)

### Certificate Management
- View all certificates: `GET /api/training/certificates`
- Download as PDF: `GET /api/training/certificates/:id/pdf`
- Verify authenticity: `GET /api/training/certificates/:id/verify`

### Certificate API
Full certificate management available via API:
- `GET /api/training/modules/:moduleId/certificate` - Generate/retrieve certificate for completed module
- `GET /api/training/certificates` - List all user certificates
- `GET /api/training/certificates/:id/verify` - Verify certificate authenticity
- `GET /api/training/certificates/:id/pdf` - Download certificate as PDF

## Reporting

### Completion Report
Shows:
- Overall completion rate
- By department
- By program
- By time period

### Compliance Report
For auditors:
- Training requirements
- Completion evidence
- Quiz scores
- Certificate records

### Export
Export reports:
- PDF (formatted)
- CSV (data)
- For compliance audits

## Campaigns

### Phishing Simulations
Test awareness:
1. Create campaign
2. Design simulated phish
3. Select targets
4. Launch campaign
5. Track results

### Campaign Results
- Click rates
- Report rates
- Training triggered
- Improvement over time

## Best Practices

### Content
- Keep training engaging
- Use real examples
- Regular content updates
- Test for understanding

### Delivery
- Set reasonable deadlines
- Send reminders
- Make training accessible
- Track exceptions

### Compliance
- Document everything
- Maintain records
- Regular reporting
- Audit readiness

## Related Topics

- [Employee Compliance Overview](overview.md)
- [User Management](../admin/users.md)

