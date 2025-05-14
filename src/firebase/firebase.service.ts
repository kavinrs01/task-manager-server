import { Injectable } from '@nestjs/common';
import firebaseAdmin from 'firebase-admin';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
@Injectable()
export class FirebaseService {
  private firebaseApp: firebaseAdmin.app.App;
  public firestoreDb: Firestore;

  constructor() {
    this.init();
  }

  private init() {
    this.firebaseApp = firebaseAdmin.initializeApp();
    this.firestoreDb = getFirestore(this.firebaseApp, 'task-manager');
  }
}
