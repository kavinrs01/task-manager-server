import { TaskPriority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class DateRangeDto {
  @IsOptional()
  @IsISO8601()
  gte?: string;

  @IsOptional()
  @IsISO8601()
  lte?: string;
}

export class TaskFilterDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dueDate?: DateRangeDto;
}

export class GetTaskListArgs {
  @IsOptional()
  @IsNumber()
  @Min(1)
  take?: number = 10;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskFilterDto)
  filter?: TaskFilterDto;
}
