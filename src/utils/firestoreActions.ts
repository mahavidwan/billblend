import { doc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Expense, Group } from '../store'; // 🚨 FIX: Imported Group interface here!

// Push a new or edited expense to the cloud
export async function cloudSaveExpense(firebaseTripId: string, expense: Expense) {
  const batch = writeBatch(db);
  
  const expRef = doc(db, `trips/${firebaseTripId}/expenses`, expense.id);
  batch.set(expRef, { ...expense, status: 'active' }, { merge: true });
  
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });

  await batch.commit();
}

// Soft-Delete (Audit Trail)
export async function cloudDeleteExpense(firebaseTripId: string, expenseId: string, userEmail: string) {
  const batch = writeBatch(db);
  
  const expRef = doc(db, `trips/${firebaseTripId}/expenses`, expenseId);
  batch.set(expRef, { status: 'deleted', deletedBy: userEmail, updatedAt: Date.now() }, { merge: true });

  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });

  await batch.commit();
}

// Cloud Checkpoint (Settle All)
export async function cloudSettleAll(firebaseTripId: string, activeExpenses: Expense[]) {
  const batch = writeBatch(db);
  
  activeExpenses.forEach(exp => {
    const expRef = doc(db, `trips/${firebaseTripId}/expenses`, exp.id);
    batch.set(expRef, { isSettled: true, updatedAt: Date.now() }, { merge: true });
  });
  
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });
  
  await batch.commit();
}

// Bulk Cloud Save (Used for Merging Members)
export async function cloudBulkUpdateExpenses(firebaseTripId: string, updatedExpenses: Expense[]) {
  const batch = writeBatch(db);
  
  updatedExpenses.forEach(exp => {
    const expRef = doc(db, `trips/${firebaseTripId}/expenses`, exp.id);
    batch.set(expRef, { ...exp, status: 'active' }, { merge: true });
  });

  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });

  await batch.commit();
}

// 🚨 Sync Group Metadata (Members, Name, Roles) to Cloud
export async function cloudUpdateGroup(firebaseTripId: string, updates: Partial<Group>) {
  const tripRef = doc(db, 'trips', firebaseTripId);
  
  // We strip out expenses because they live in a subcollection!
  const { expenses, id, firebaseTripId: _, ...safeUpdates } = updates as any;
  
  await setDoc(tripRef, { 
    ...safeUpdates, 
    updatedAt: Date.now() 
  }, { merge: true });
}


// --- 🚨 NEW: Completely wipe a Live Trip from Firestore ---
export async function cloudEndCollaboration(firebaseTripId: string) {
  // 1. We must delete all expenses in the subcollection first!
  const expensesRef = collection(db, `trips/${firebaseTripId}/expenses`);
  const expSnap = await getDocs(expensesRef);
  
  const batch = writeBatch(db);
  expSnap.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  
  // 2. Delete the root trip document
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.delete(tripRef);

  await batch.commit();
}