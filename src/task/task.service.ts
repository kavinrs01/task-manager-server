import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { CurrentAuthUser } from '../utils/types';
import { GetTaskListArgs } from './dto/task-filter.dto';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async getSortOrderForCreateTask() {
    const getLatestTask = await this.prisma.task.findMany({
      take: 1,
      orderBy: {
        sortOrder: 'desc',
      },
    });
    return getLatestTask[0].sortOrder + 1;
  }

  async create(dto: CreateTaskDto, currentUser: CurrentAuthUser) {
    if (
      currentUser?.role === 'USER' &&
      dto.assignedToUserId &&
      dto.assignedToUserId !== currentUser?.id
    ) {
      throw new ForbiddenException(
        'Users can only assign tasks to themselves.',
      );
    }

    const assignedTo = dto.assignedToUserId ?? currentUser.id;

    const sortOrder = await this.getSortOrderForCreateTask();

    return await this.prisma.task.create({
      data: {
        ...dto,
        dueDate: dto.dueDate,
        assignedToUserId: assignedTo,
        createdByUserId: currentUser.id,
        sortOrder: sortOrder,
      },
    });
  }

  async findAll(
    currentUser: CurrentAuthUser,
    { filter, take, cursor }: GetTaskListArgs,
  ) {
    const { id: userId, role } = currentUser;

    let where: Prisma.TaskWhereInput = { isArchived: false };
    if (role === Role.ADMIN) {
      where = { isArchived: false };
    } else {
      where = { assignedToUserId: userId, isArchived: false };
    }

    if (filter) {
      if (filter?.status) {
        where = {
          ...where,
          status: filter?.status,
        };
      }
      if (filter?.priority) {
        where = {
          ...where,
          priority: filter?.priority,
        };
      }
      if (filter?.dueDate) {
        if (filter?.dueDate?.gte && filter?.dueDate?.lte) {
          where = {
            ...where,
            AND: [
              {
                dueDate: {
                  gte: filter?.dueDate?.gte,
                },
              },
              {
                dueDate: {
                  lte: filter?.dueDate?.lte,
                },
              },
            ],
          };
        } else {
          if (filter?.dueDate?.gte) {
            where = {
              ...where,
              dueDate: {
                gte: filter?.dueDate?.gte,
              },
            };
          }
          if (filter?.dueDate?.lte) {
            where = {
              ...where,
              dueDate: {
                lte: filter?.dueDate?.lte,
              },
            };
          }
        }
      }
    }

    return await this.prisma.task.findMany({
      where,
      take,
      skip: cursor ? 1 : 0,
      ...(cursor && {
        cursor: { id: cursor },
      }),
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    return await this.prisma.task.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateTaskDto, currentUser: CurrentAuthUser) {
    const { id: userId, role } = currentUser;
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    if (role !== 'ADMIN' && existing.assignedToUserId !== userId) {
      throw new ForbiddenException('You can only update your own tasks.');
    }

    if (
      role === 'USER' &&
      dto.assignedToUserId &&
      dto.assignedToUserId !== userId
    ) {
      throw new ForbiddenException('You cannot assign tasks to others.');
    }

    return await this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate,
      },
    });
  }

  async remove(id: string, currentUser: CurrentAuthUser) {
    const { id: userId, role } = currentUser;
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    if (
      role !== 'ADMIN' &&
      existing.createdByUserId !== userId &&
      existing.assignedToUserId !== userId
    ) {
      throw new ForbiddenException('You can only delete tasks you created.');
    }

    return await this.prisma.task.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
