import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ) {
    return this.prisma.comment.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
        parentId: null, // Only top-level comments
      },
      include: {
        author: {
          select: { id: true, displayName: true, email: true },
        },
        replies: {
          include: {
            author: {
              select: { id: true, displayName: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    authorId: string,
    data: {
      entityType: string;
      entityId: string;
      content: string;
      parentId?: string;
    },
  ) {
    return this.prisma.comment.create({
      data: {
        organizationId,
        authorId,
        entityType: data.entityType,
        entityId: data.entityId,
        content: data.content,
        parentId: data.parentId,
      },
      include: {
        author: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    authorId: string,
    data: { content?: string; isResolved?: boolean },
  ) {
    const comment = await this.prisma.comment.findFirst({
      where: { id, organizationId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author can edit content, anyone can resolve
    if (data.content && comment.authorId !== authorId) {
      throw new NotFoundException('Cannot edit another user\'s comment');
    }

    return this.prisma.comment.update({
      where: { id },
      data,
      include: {
        author: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });
  }

  async delete(id: string, organizationId: string, authorId: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id, organizationId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== authorId) {
      throw new NotFoundException('Cannot delete another user\'s comment');
    }

    // Delete replies first
    await this.prisma.comment.deleteMany({
      where: { parentId: id },
    });

    return this.prisma.comment.delete({
      where: { id },
    });
  }
}



