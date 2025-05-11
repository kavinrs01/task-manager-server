import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { parseNestedQueryParams } from '../utils/transformer';
import { CurrentAuthUser } from '../utils/types';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTaskListArgs } from './dto/task-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';
import { UpdateSortOrderDto } from './dto/update-sort-order.dto';
import { Task } from '@prisma/client';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('create')
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    return await this.taskService.create(dto, user);
  }

  @Get('list')
  async getTaskList(
    @CurrentUser() user: CurrentAuthUser,
    @Query() rawQuery: Record<string, any>,
  ) {
    const parsedQuery = parseNestedQueryParams(rawQuery);
    const args = plainToInstance(GetTaskListArgs, parsedQuery, {
      enableImplicitConversion: true,
    });

    const errors = validateSync(args, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
    return await this.taskService.findAll(user, args);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.taskService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    return await this.taskService.update(id, dto, user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentAuthUser) {
    return await this.taskService.remove(id, user);
  }

  @Patch('sort-order')
  async updateSortOrder(@Body() dto: UpdateSortOrderDto): Promise<Task> {
    return await this.taskService.updateSortOrder(dto);
  }
}
