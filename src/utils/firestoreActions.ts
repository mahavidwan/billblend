import { doc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Expense, Group, Member } from '../store';

// 1. ADD / EDIT EXPENSE
export async function cloudSaveExpense(firebaseTripId: string, expense: Expense) {
  const batch = writeBatch(db);
  const expRef = doc(db, `trips/${firebaseTripId}/expenses`, expense.id);
  batch.set(expRef, { ...expense, status: 'active' }, { merge: true });
  
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });

  await batch.commit();
}

// 2. SOFT DELETE EXPENSE
export async function cloudDeleteExpense(firebaseTripId: string, expenseId: string, userEmail: string) {
  const batch = writeBatch(db);
  const expRef = doc(db, `trips/${firebaseTripId}/expenses`, expenseId);
  batch.set(expRef, { status: 'deleted', deletedBy: userEmail, updatedAt: Date.now() }, { merge: true });

  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });

  await batch.commit();
}

// 3. SETTLE ALL (Archive)
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

// 4. PARTIAL SETTLEMENTS (Record Repayments)
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

// 5. METADATA UPDATES (Settings, Roles, Rename, Fund Toggles, Add/Remove Member)
export async function cloudUpdateGroup(firebaseTripId: string, updates: Partial<Group>) {
  const tripRef = doc(db, 'trips', firebaseTripId);
  // Strip out expenses because they live in a subcollection!
  const { expenses, id, firebaseTripId: _, ...safeUpdates } = updates as any;
  await setDoc(tripRef, { ...safeUpdates, updatedAt: Date.now() }, { merge: true });
}

// 6. END COLLABORATION (Wipe from Cloud)
export async function cloudEndCollaboration(firebaseTripId: string) {
  const expensesRef = collection(db, `trips/${firebaseTripId}/expenses`);
  const expSnap = await getDocs(expensesRef);
  const batch = writeBatch(db);
  expSnap.forEach((docSnap) => { batch.delete(docSnap.ref); });
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.delete(tripRef);
  await batch.commit();
}

// 🚨 7. NEW: ATOMIC GHOST MERGE
// This guarantees that the Member List and the altered Expenses all update at the exact same millisecond in the cloud.
export async function cloudExecuteMerge(firebaseTripId: string, updatedMembers: Member[], modifiedExpenses: Expense[]) {
  const batch = writeBatch(db);
  
  // Update the members array on the root trip doc
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { members: updatedMembers, updatedAt: Date.now() }, { merge: true });

  // Update ONLY the expenses that were actually altered by the merge
  modifiedExpenses.forEach(exp => {
    const expRef = doc(db, `trips/${firebaseTripId}/expenses`, exp.id);
    batch.set(expRef, { ...exp, updatedAt: Date.now(), status: 'active' }, { merge: true });
  });

  await batch.commit();
}