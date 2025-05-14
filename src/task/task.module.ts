import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

@Module({
  imports: [FirebaseModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
