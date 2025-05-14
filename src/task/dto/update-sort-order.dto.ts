import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskStatus } from '@prisma/client'; // Adjust path if needed

export class UpdateSortOrderDto {
  @IsString()
  activeTaskId: string;

  @IsOptional()
  @IsString()
  overTaskId?: string;

  @IsOptional()
  @IsString()
  columnLastTaskId?: string;

  @IsEnum(TaskStatus)
  newStatus: TaskStatus;
}
