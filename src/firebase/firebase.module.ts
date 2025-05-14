import { Module } from '@nestjs/common';
import { FirebaseDatabaseService } from './firebase-db.service';
import { FirebaseService } from './firebase.service';

@Module({
  imports: [],
  controllers: [],
  providers: [FirebaseService, FirebaseDatabaseService],
  exports: [FirebaseDatabaseService],
})
export class FirebaseModule {}
