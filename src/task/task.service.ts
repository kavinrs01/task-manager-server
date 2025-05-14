import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, Role, Task } from '@prisma/client';
import { DateTime } from 'luxon';
import { FirebaseDatabaseService } from '../firebase/firebase-db.service';
import { FirebaseCollection } from '../firebase/firebase-interface';
import { CurrentAuthUser } from '../utils/types';
import { GetTaskListArgs } from './dto/task-filter.dto';
import { UpdateSortOrderDto } from './dto/update-sort-order.dto';
import { FirebaseTask, TaskActionType } from './task.interface';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private readonly firebaseDatabaseService: FirebaseDatabaseService,
  ) {}

  async getSortOrderForLatestTask() {
    const getLatestTask = await this.prisma.task.findFirst({
      where: { isArchived: false },
      orderBy: {
        sortOrder: 'desc',
      },
    });
    return (getLatestTask?.sortOrder || 0) + 1;
  }

  async create(dto: CreateTaskDto, currentUser: CurrentAuthUser) {
    if (
      currentUser?.role === Role.USER &&
      dto.assignedToUserId &&
      dto.assignedToUserId !== currentUser?.id
    ) {
      throw new ForbiddenException(
        'Users can only assign tasks to themselves.',
      );
    }

    if (currentUser?.role === Role.USER && !dto.isPrivate) {
      throw new ForbiddenException('Users can only create private tasks.');
    }

    const assignedTo = dto.assignedToUserId ?? currentUser.id;

    const sortOrder = await this.getSortOrderForLatestTask();

    const task = await this.prisma.task.create({
      data: {
        ...dto,
        dueDate: dto.dueDate,
        assignedToUserId: assignedTo,
        createdByUserId: currentUser.id,
        sortOrder: sortOrder,
      },
    });
    await this.upsertTaskInFireStore({
      actionType: TaskActionType.CREATED,
      id: task.id,
      updatedAt: DateTime.now().toISO(),
    });
    return task;
  }

  async findAll(
    currentUser: CurrentAuthUser,
    { filter, take, cursor }: GetTaskListArgs,
  ) {
    const { id: userId, role } = currentUser;

    let where: Prisma.TaskWhereInput = { isArchived: false };
    if (role === Role.ADMIN) {
      where = {
        isArchived: false,
        NOT: {
          AND: [{ isPrivate: true }, { assignedToUserId: { not: userId } }],
        },
      };
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
      orderBy: { sortOrder: 'desc' },
    });
  }

  async findOne(id: string) {
    return await this.prisma.task.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateTaskDto, currentUser: CurrentAuthUser) {
    const { id: userId, role } = currentUser;
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    if (role === Role.USER && existing.assignedToUserId !== userId) {
      throw new ForbiddenException('You can only update your own tasks.');
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
      },
    });

    await this.upsertTaskInFireStore({
      actionType: TaskActionType.UPDATED,
      id: task.id,
      updatedAt: DateTime.now().toISO(),
    });
    return task;
  }

  async remove(id: string, currentUser: CurrentAuthUser) {
    const { id: userId, role } = currentUser;
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    if (
      role === Role.ADMIN &&
      existing?.isPrivate &&
      existing?.assignedToUserId !== userId
    ) {
      throw new ForbiddenException('Not authorized others private tasks');
    }
    if (role === Role.USER && existing.assignedToUserId !== userId) {
      throw new ForbiddenException('You can only delete tasks you created.');
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: { isArchived: true },
    });
    await this.upsertTaskInFireStore({
      actionType: TaskActionType.UPDATED,
      id: task.id,
      updatedAt: DateTime.now().toISO(),
    });
    return task;
  }
  async updateSortOrder(
    {
      activeTaskId,
      overTaskId,
      columnLastTaskId,
      newStatus,
    }: UpdateSortOrderDto,
    { id: userId, role }: CurrentAuthUser,
  ): Promise<Task> {
    const activeTask = await this.prisma.task.findUnique({
      where: { id: activeTaskId },
    });

    if (!activeTask) {
      throw new HttpException('Active task not found', 404);
    }
    if (
      role === Role.ADMIN &&
      activeTask?.isPrivate &&
      activeTask?.assignedToUserId !== userId
    ) {
      throw new ForbiddenException('Not authorized others private tasks');
    }
    if (role === Role.USER && activeTask.assignedToUserId !== userId) {
      throw new ForbiddenException('You can only delete tasks you created.');
    }

    const calculateMidSortOrder = (a: number, b: number): number =>
      Number(((a + b) / 2).toFixed(6));

    if (overTaskId) {
      const overTask = await this.prisma.task.findUnique({
        where: { id: overTaskId },
      });
      if (!overTask) {
        throw new HttpException('Over task not found', 404);
      }

      const previousTask = await this.prisma.task.findFirst({
        where: { sortOrder: { gt: overTask.sortOrder }, isArchived: false },
        orderBy: { sortOrder: 'asc' },
      });

      const newSortOrder = previousTask
        ? calculateMidSortOrder(previousTask.sortOrder, overTask.sortOrder)
        : Number((overTask.sortOrder + 1).toFixed(6));

      const task = await this.prisma.task.update({
        where: { id: activeTaskId },
        data: {
          sortOrder: newSortOrder,
          status: newStatus,
        },
      });

      await this.upsertTaskInFireStore({
        actionType: TaskActionType.UPDATED,
        id: task.id,
        updatedAt: DateTime.now().toISO(),
      });
      return task;
    }

    if (columnLastTaskId) {
      const columnLastTask = await this.prisma.task.findUnique({
        where: { id: columnLastTaskId },
      });
      if (!columnLastTask) {
        throw new HttpException('Column last task not found', 404);
      }

      const nextTask = await this.prisma.task.findFirst({
        where: {
          sortOrder: { lt: columnLastTask.sortOrder },
          isArchived: false,
        },
        orderBy: { sortOrder: 'desc' },
      });

      const newSortOrder = nextTask
        ? calculateMidSortOrder(nextTask.sortOrder, columnLastTask.sortOrder)
        : Number((columnLastTask.sortOrder - 1).toFixed(6));

      const task = await this.prisma.task.update({
        where: { id: activeTaskId },
        data: { sortOrder: newSortOrder, status: newStatus },
      });
      await this.upsertTaskInFireStore({
        actionType: TaskActionType.UPDATED,
        id: task.id,
        updatedAt: DateTime.now().toISO(),
      });
      return task;
    }

    if (!overTaskId && !columnLastTaskId) {
      const sortOder = await this.getSortOrderForLatestTask();

      const task = await this.prisma.task.update({
        where: { id: activeTaskId },
        data: { status: newStatus, sortOrder: sortOder },
      });

      await this.upsertTaskInFireStore({
        actionType: TaskActionType.UPDATED,
        id: task.id,
        updatedAt: DateTime.now().toISO(),
      });
      return task;
    }

    throw new HttpException('Invalid sort order update context', 400);
  }

  async getSubscribedTask(id: string, currentUser: CurrentAuthUser) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (
      (currentUser.role === Role.USER &&
        task?.assignedToUserId !== currentUser.id) ||
      (task?.isPrivate && task?.assignedToUserId !== currentUser.id)
    ) {
      throw new HttpException('Not authorized', 403);
    } else {
      return task;
    }
  }

  private async upsertTaskInFireStore(data: FirebaseTask) {
    await this.firebaseDatabaseService.createOrOverwriteDocument(
      FirebaseCollection.TASKS,
      data?.id,
      {
        ...data,
      },
    );
  }
}
