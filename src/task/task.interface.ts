enum TaskActionType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}

interface FirebaseTask {
  actionType: TaskActionType;
  id: string;
  updatedAt: string;
}

export { TaskActionType };

export type { FirebaseTask };
