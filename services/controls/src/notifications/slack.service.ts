 
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SlackMessage {
  userId?: string; // Slack user ID for DMs
  channel?: string; // Slack channel ID for channel messages
  text: string;
  blocks?: SlackBlock[];
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: Array<Record<string, unknown>>;
  accessory?: Record<string, unknown>;
  fields?: Array<Record<string, unknown>>;
}

export interface TaskSlackNotification {
  slackUserId: string;
  taskTitle: string;
  taskType: string;
  riskId: string;
  riskTitle: string;
  priority: string;
  dueDate?: Date;
  appUrl: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly webhookUrl: string;
  private readonly botToken: string;
  private readonly enabled: boolean;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.botToken = process.env.SLACK_BOT_TOKEN || '';
    this.enabled = !!(this.webhookUrl || this.botToken);

    if (!this.enabled) {
      this.logger.warn('Slack integration is not configured. Set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN to enable.');
    }
  }

  /**
   * Check if Slack integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Send a DM to a Slack user about a task assignment
   */
  async sendTaskAssignedNotification(notification: TaskSlackNotification): Promise<boolean> {
    if (!this.enabled || !notification.slackUserId) {
      return false;
    }

    const priorityEmoji = this.getPriorityEmoji(notification.priority);
    const dueDateText = notification.dueDate 
      ? `\n:calendar: Due: ${notification.dueDate.toLocaleDateString()}`
      : '';

    const message: SlackMessage = {
      userId: notification.slackUserId,
      text: `${priorityEmoji} New Task Assigned: ${notification.taskTitle}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${priorityEmoji} New Task Assigned`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Task:*\n${notification.taskTitle}`,
            },
            {
              type: 'mrkdwn',
              text: `*Type:*\n${this.formatTaskType(notification.taskType)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Risk:*\n${notification.riskId} - ${notification.riskTitle}`,
            },
            {
              type: 'mrkdwn',
              text: `*Priority:*\n${notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}${dueDateText}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View in GRC',
                emoji: true,
              },
              url: notification.appUrl,
              action_id: 'view_task',
            },
          ],
        },
      ],
    };

    return this.sendDirectMessage(message);
  }

  /**
   * Send a DM to a Slack user about task completion
   */
  async sendTaskCompletedNotification(
    slackUserId: string,
    taskTitle: string,
    riskId: string,
    completedByName: string,
    resultingAction?: string,
  ): Promise<boolean> {
    if (!this.enabled || !slackUserId) {
      return false;
    }

    const message: SlackMessage = {
      userId: slackUserId,
      text: `:white_check_mark: Task Completed: ${taskTitle}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:white_check_mark: *Task Completed*\n*${taskTitle}*\n\nRisk: ${riskId}\nCompleted by: ${completedByName}${resultingAction ? `\nResult: ${resultingAction}` : ''}`,
          },
        },
      ],
    };

    return this.sendDirectMessage(message);
  }

  /**
   * Send a DM to a Slack user
   */
  private async sendDirectMessage(message: SlackMessage): Promise<boolean> {
    if (!this.botToken || !message.userId) {
      return false;
    }

    try {
      // First, open a DM channel with the user
      const openResponse = await axios.post(
        'https://slack.com/api/conversations.open',
        { users: message.userId },
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!openResponse.data.ok) {
        this.logger.error(`Failed to open DM channel: ${openResponse.data.error}`);
        return false;
      }

      const channelId = openResponse.data.channel.id;

      // Send the message
      const messagePayload: { channel: string; text: string; blocks?: SlackBlock[] } = {
        channel: channelId,
        text: message.text,
      };

      if (message.blocks) {
        messagePayload.blocks = message.blocks;
      }

      const sendResponse = await axios.post(
        'https://slack.com/api/chat.postMessage',
        messagePayload,
        {
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!sendResponse.data.ok) {
        this.logger.error(`Failed to send Slack message: ${sendResponse.data.error}`);
        return false;
      }

      this.logger.log(`Slack DM sent to user ${message.userId}`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Slack API error: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Send a message to a Slack channel via webhook
   */
  async sendWebhookMessage(text: string, blocks?: SlackBlock[]): Promise<boolean> {
    if (!this.webhookUrl) {
      return false;
    }

    try {
      const payload: { text: string; blocks?: SlackBlock[] } = { text };
      if (blocks) {
        payload.blocks = blocks;
      }

      await axios.post(this.webhookUrl, payload);
      this.logger.log('Slack webhook message sent');
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Slack webhook error: ${errorMessage}`);
      return false;
    }
  }

  private getPriorityEmoji(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical':
        return ':rotating_light:';
      case 'high':
        return ':warning:';
      case 'medium':
        return ':large_yellow_circle:';
      case 'low':
        return ':white_circle:';
      default:
        return ':bell:';
    }
  }

  private formatTaskType(taskType: string): string {
    return taskType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
