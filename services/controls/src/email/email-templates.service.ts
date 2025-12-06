import { Injectable } from '@nestjs/common';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailTemplatesService {
  private readonly baseUrl = process.env.FRONTEND_URL || 'https://app.gigachad-grc.com';

  generateTemplate(
    type: NotificationType,
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const templates = {
      [NotificationType.CONTROL_STATUS_CHANGED]: this.controlStatusChanged,
      [NotificationType.CONTROL_DUE_SOON]: this.controlReviewDue,
      [NotificationType.CONTROL_OVERDUE]: this.controlReviewDue,
      [NotificationType.EVIDENCE_EXPIRING]: this.evidenceExpiringSoon,
      [NotificationType.EVIDENCE_EXPIRED]: this.evidenceExpired,
      [NotificationType.EVIDENCE_REVIEWED]: this.evidenceReviewed,
      [NotificationType.POLICY_REVIEW_DUE]: this.policyReviewDue,
      [NotificationType.POLICY_STATUS_CHANGED]: this.policyStatusChanged,
      [NotificationType.POLICY_APPROVED]: this.policyApproved,
      [NotificationType.POLICY_REJECTED]: this.policyRejected,
      [NotificationType.TASK_ASSIGNED]: this.taskAssigned,
      [NotificationType.TASK_DUE_SOON]: this.taskDueSoon,
      [NotificationType.TASK_OVERDUE]: this.taskOverdue,
      [NotificationType.TASK_COMPLETED]: this.taskCompleted,
      [NotificationType.COLLECTOR_SUCCESS]: this.integrationCollectorSuccess,
      [NotificationType.COLLECTOR_FAILED]: this.integrationCollectorFailed,
      [NotificationType.INTEGRATION_SYNC_FAILED]: this.integrationCollectorFailed,
      [NotificationType.COMMENT_MENTION]: this.mention,
      [NotificationType.COMMENT_REPLY]: this.reply,
    };

    const templateFn = templates[type] || this.defaultTemplate;
    return templateFn.call(this, title, message, severity, metadata);
  }

  private controlStatusChanged(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const controlId = metadata?.controlId || 'Unknown';
    const status = metadata?.status || 'Unknown';
    const controlLink = `${this.baseUrl}/controls/${controlId}`;

    return {
      subject: `Control Status Changed: ${title}`,
      html: this.wrapHtml(`
        <h2>Control Status Update</h2>
        <p>The status of control <strong>${title}</strong> has been changed to <strong>${status}</strong>.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${controlLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Control</a>
        </p>
      `, severity),
      text: `Control Status Update\n\nThe status of control ${title} has been changed to ${status}.\n\n${message}\n\nView control: ${controlLink}`,
    };
  }

  private controlReviewDue(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const controlId = metadata?.controlId || 'Unknown';
    const dueDate = metadata?.dueDate || 'Unknown';
    const controlLink = `${this.baseUrl}/controls/${controlId}`;

    return {
      subject: `Control Review Due: ${title}`,
      html: this.wrapHtml(`
        <h2>Control Review Reminder</h2>
        <p>Control <strong>${title}</strong> is due for review on <strong>${dueDate}</strong>.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${controlLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Control</a>
        </p>
      `, severity),
      text: `Control Review Reminder\n\nControl ${title} is due for review on ${dueDate}.\n\n${message}\n\nReview control: ${controlLink}`,
    };
  }

  private evidenceExpiringSoon(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const evidenceId = metadata?.evidenceId || 'Unknown';
    const expiryDate = metadata?.expiryDate || 'Unknown';
    const evidenceLink = `${this.baseUrl}/evidence/${evidenceId}`;

    return {
      subject: `Evidence Expiring Soon: ${title}`,
      html: this.wrapHtml(`
        <h2>Evidence Expiration Warning</h2>
        <p>Evidence <strong>${title}</strong> will expire on <strong>${expiryDate}</strong>.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${evidenceLink}" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Update Evidence</a>
        </p>
      `, severity),
      text: `Evidence Expiration Warning\n\nEvidence ${title} will expire on ${expiryDate}.\n\n${message}\n\nUpdate evidence: ${evidenceLink}`,
    };
  }

  private evidenceExpired(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const evidenceId = metadata?.evidenceId || 'Unknown';
    const evidenceLink = `${this.baseUrl}/evidence/${evidenceId}`;

    return {
      subject: `Evidence Expired: ${title}`,
      html: this.wrapHtml(`
        <h2>Evidence Has Expired</h2>
        <p>Evidence <strong>${title}</strong> has expired and needs to be updated.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${evidenceLink}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Update Evidence</a>
        </p>
      `, severity),
      text: `Evidence Has Expired\n\nEvidence ${title} has expired and needs to be updated.\n\n${message}\n\nUpdate evidence: ${evidenceLink}`,
    };
  }

  private evidenceReviewed(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const evidenceId = metadata?.evidenceId || 'Unknown';
    const status = metadata?.reviewStatus || 'reviewed';
    const evidenceLink = `${this.baseUrl}/evidence/${evidenceId}`;

    return {
      subject: `Evidence ${status}: ${title}`,
      html: this.wrapHtml(`
        <h2>Evidence Review Update</h2>
        <p>Your evidence <strong>${title}</strong> has been ${status}.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${evidenceLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Evidence</a>
        </p>
      `, severity),
      text: `Evidence Review Update\n\nYour evidence ${title} has been ${status}.\n\n${message}\n\nView evidence: ${evidenceLink}`,
    };
  }

  private policyReviewDue(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const policyId = metadata?.policyId || 'Unknown';
    const dueDate = metadata?.dueDate || 'Unknown';
    const policyLink = `${this.baseUrl}/policies/${policyId}`;

    return {
      subject: `Policy Review Due: ${title}`,
      html: this.wrapHtml(`
        <h2>Policy Review Reminder</h2>
        <p>Policy <strong>${title}</strong> is due for review on <strong>${dueDate}</strong>.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${policyLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Policy</a>
        </p>
      `, severity),
      text: `Policy Review Reminder\n\nPolicy ${title} is due for review on ${dueDate}.\n\n${message}\n\nReview policy: ${policyLink}`,
    };
  }

  private policyStatusChanged(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const policyId = metadata?.policyId || 'Unknown';
    const status = metadata?.status || 'Unknown';
    const policyLink = `${this.baseUrl}/policies/${policyId}`;

    return {
      subject: `Policy Status Changed: ${title}`,
      html: this.wrapHtml(`
        <h2>Policy Status Update</h2>
        <p>The status of policy <strong>${title}</strong> has been changed to <strong>${status}</strong>.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${policyLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Policy</a>
        </p>
      `, severity),
      text: `Policy Status Update\n\nThe status of policy ${title} has been changed to ${status}.\n\n${message}\n\nView policy: ${policyLink}`,
    };
  }

  private policyApproved(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const policyId = metadata?.policyId || 'Unknown';
    const policyLink = `${this.baseUrl}/policies/${policyId}`;

    return {
      subject: `Policy Approved: ${title}`,
      html: this.wrapHtml(`
        <h2>Policy Approved</h2>
        <p>Policy <strong>${title}</strong> has been approved and is now in effect.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${policyLink}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Policy</a>
        </p>
      `, severity),
      text: `Policy Approved\n\nPolicy ${title} has been approved and is now in effect.\n\n${message}\n\nView policy: ${policyLink}`,
    };
  }

  private policyRejected(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const policyId = metadata?.policyId || 'Unknown';
    const policyLink = `${this.baseUrl}/policies/${policyId}`;

    return {
      subject: `Policy Rejected: ${title}`,
      html: this.wrapHtml(`
        <h2>Policy Rejected</h2>
        <p>Policy <strong>${title}</strong> has been rejected and requires revisions.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${policyLink}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Policy</a>
        </p>
      `, severity),
      text: `Policy Rejected\n\nPolicy ${title} has been rejected and requires revisions.\n\n${message}\n\nView policy: ${policyLink}`,
    };
  }

  private taskAssigned(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const taskId = metadata?.taskId || 'Unknown';
    const dueDate = metadata?.dueDate || 'No due date';
    const taskLink = `${this.baseUrl}/tasks/${taskId}`;

    return {
      subject: `Task Assigned: ${title}`,
      html: this.wrapHtml(`
        <h2>New Task Assignment</h2>
        <p>You have been assigned a new task: <strong>${title}</strong></p>
        <p>${message}</p>
        <p>Due date: <strong>${dueDate}</strong></p>
        <p style="margin-top: 20px;">
          <a href="${taskLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
        </p>
      `, severity),
      text: `New Task Assignment\n\nYou have been assigned a new task: ${title}\n\n${message}\n\nDue date: ${dueDate}\n\nView task: ${taskLink}`,
    };
  }

  private taskDueSoon(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const taskId = metadata?.taskId || 'Unknown';
    const dueDate = metadata?.dueDate || 'Soon';
    const taskLink = `${this.baseUrl}/tasks/${taskId}`;

    return {
      subject: `Task Due Soon: ${title}`,
      html: this.wrapHtml(`
        <h2>Task Deadline Approaching</h2>
        <p>Task <strong>${title}</strong> is due on <strong>${dueDate}</strong>.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${taskLink}" style="background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
        </p>
      `, severity),
      text: `Task Deadline Approaching\n\nTask ${title} is due on ${dueDate}.\n\n${message}\n\nView task: ${taskLink}`,
    };
  }

  private taskOverdue(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const taskId = metadata?.taskId || 'Unknown';
    const taskLink = `${this.baseUrl}/tasks/${taskId}`;

    return {
      subject: `Task Overdue: ${title}`,
      html: this.wrapHtml(`
        <h2>Task Overdue</h2>
        <p>Task <strong>${title}</strong> is now overdue and requires immediate attention.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${taskLink}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
        </p>
      `, severity),
      text: `Task Overdue\n\nTask ${title} is now overdue and requires immediate attention.\n\n${message}\n\nView task: ${taskLink}`,
    };
  }

  private taskCompleted(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const taskId = metadata?.taskId || 'Unknown';
    const taskLink = `${this.baseUrl}/tasks/${taskId}`;

    return {
      subject: `Task Completed: ${title}`,
      html: this.wrapHtml(`
        <h2>Task Completed</h2>
        <p>Task <strong>${title}</strong> has been marked as completed.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${taskLink}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
        </p>
      `, severity),
      text: `Task Completed\n\nTask ${title} has been marked as completed.\n\n${message}\n\nView task: ${taskLink}`,
    };
  }

  private integrationCollectorSuccess(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const collectorId = metadata?.collectorId || 'Unknown';
    const collectorLink = `${this.baseUrl}/integrations/collectors/${collectorId}`;

    return {
      subject: `Integration Collector Success: ${title}`,
      html: this.wrapHtml(`
        <h2>Collector Run Successful</h2>
        <p>Integration collector <strong>${title}</strong> has completed successfully.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${collectorLink}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Collector</a>
        </p>
      `, severity),
      text: `Collector Run Successful\n\nIntegration collector ${title} has completed successfully.\n\n${message}\n\nView collector: ${collectorLink}`,
    };
  }

  private integrationCollectorFailed(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const collectorId = metadata?.collectorId || 'Unknown';
    const errorMessage = metadata?.error || 'Unknown error';
    const collectorLink = `${this.baseUrl}/integrations/collectors/${collectorId}`;

    return {
      subject: `Integration Collector Failed: ${title}`,
      html: this.wrapHtml(`
        <h2>Collector Run Failed</h2>
        <p>Integration collector <strong>${title}</strong> has failed.</p>
        <p>${message}</p>
        <p><strong>Error:</strong> ${errorMessage}</p>
        <p style="margin-top: 20px;">
          <a href="${collectorLink}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Collector</a>
        </p>
      `, severity),
      text: `Collector Run Failed\n\nIntegration collector ${title} has failed.\n\n${message}\n\nError: ${errorMessage}\n\nView collector: ${collectorLink}`,
    };
  }

  private mention(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const entityType = metadata?.entityType || 'item';
    const entityId = metadata?.entityId || 'Unknown';
    const mentionedBy = metadata?.mentionedBy || 'Someone';
    const link = `${this.baseUrl}/${entityType}/${entityId}`;

    return {
      subject: `You were mentioned: ${title}`,
      html: this.wrapHtml(`
        <h2>You Were Mentioned</h2>
        <p><strong>${mentionedBy}</strong> mentioned you in <strong>${title}</strong>.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${link}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Comment</a>
        </p>
      `, severity),
      text: `You Were Mentioned\n\n${mentionedBy} mentioned you in ${title}.\n\n${message}\n\nView: ${link}`,
    };
  }

  private reply(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    const entityType = metadata?.entityType || 'item';
    const entityId = metadata?.entityId || 'Unknown';
    const repliedBy = metadata?.repliedBy || 'Someone';
    const link = `${this.baseUrl}/${entityType}/${entityId}`;

    return {
      subject: `New reply: ${title}`,
      html: this.wrapHtml(`
        <h2>New Reply</h2>
        <p><strong>${repliedBy}</strong> replied to your comment in <strong>${title}</strong>.</p>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${link}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Reply</a>
        </p>
      `, severity),
      text: `New Reply\n\n${repliedBy} replied to your comment in ${title}.\n\n${message}\n\nView: ${link}`,
    };
  }

  private defaultTemplate(
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): EmailTemplate {
    return {
      subject: title,
      html: this.wrapHtml(`
        <h2>${title}</h2>
        <p>${message}</p>
        <p style="margin-top: 20px;">
          <a href="${this.baseUrl}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        </p>
      `, severity),
      text: `${title}\n\n${message}\n\nGo to dashboard: ${this.baseUrl}`,
    };
  }

  private wrapHtml(content: string, severity: NotificationSeverity): string {
    const severityColors = {
      [NotificationSeverity.INFO]: '#3b82f6',
      [NotificationSeverity.SUCCESS]: '#10b981',
      [NotificationSeverity.WARNING]: '#f59e0b',
      [NotificationSeverity.ERROR]: '#dc2626',
    };

    const color = severityColors[severity] || severityColors[NotificationSeverity.INFO];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GigaChad GRC Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background-color: ${color}; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">GigaChad GRC</h1>
    </div>
    <div style="padding: 30px;">
      ${content}
    </div>
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0;">
        This is an automated notification from GigaChad GRC.<br>
        To manage your notification preferences, visit your <a href="${this.baseUrl}/settings/notifications" style="color: ${color};">account settings</a>.
      </p>
      <p style="margin: 10px 0 0 0;">
        © ${new Date().getFullYear()} GigaChad GRC. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
