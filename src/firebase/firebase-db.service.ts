// src/firebase/firebase-database.service.ts
import { Injectable } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Injectable()
export class FirebaseDatabaseService {
  constructor(private readonly firebaseService: FirebaseService) {}
  // Create or overwrite a document
  async createOrOverwriteDocument(
    collectionName: string,
    docId: string,
    data: any,
  ): Promise<void> {
    console.log(
      `Attempting to set document in collection: ${collectionName}, with ID: ${docId}`,
    );
    try {
      await this.firebaseService.firestoreDb
        .collection(collectionName)
        .doc(docId)
        .set(data, { merge: true });
      console.log(`Successfully set document in ${collectionName}/${docId}`);
    } catch (error) {
      console.error('Error setting document:', error);
      throw error;
    }
  }

  // Get a single document
  async getDocument<T = any>(
    collectionName: string,
    docId: string,
  ): Promise<T | null> {
    const doc = await this.firebaseService.firestoreDb
      .collection(collectionName)
      .doc(docId)
      .get();
    console.log('doc', doc.data());
    if (!doc.exists) {
      return null;
    }
    return doc.data() as T;
  }

  // Update fields in a document
  async updateDocument(
    collectionName: string,
    docId: string,
    data: Partial<any>,
  ): Promise<void> {
    await this.firebaseService.firestoreDb
      .collection(collectionName)
      .doc(docId)
      .update(data);
  }

  // Delete a document
  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    await this.firebaseService.firestoreDb
      .collection(collectionName)
      .doc(docId)
      .delete();
  }

  // Query a collection with simple where condition
  async queryCollection<T = any>(
    collectionName: string,
    field: string,
    operator: FirebaseFirestore.WhereFilterOp,
    value: any,
  ): Promise<T[]> {
    const snapshot = await this.firebaseService.firestoreDb
      .collection(collectionName)
      .where(field, operator, value)
      .get();
    return snapshot.docs.map((doc) => doc.data() as T);
  }
}
