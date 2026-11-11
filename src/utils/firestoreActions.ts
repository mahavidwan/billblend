import { doc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Expense, Group, Member } from '../store';
import { sanitizeForFirestore } from './sanitize'; // 🚨 IMPORT THE SANITIZER

// 1. ADD / EDIT EXPENSE
export async function cloudSaveExpense(firebaseTripId: string, expense: Expense) {
  const batch = writeBatch(db);
  const expRef = doc(db, `trips/${firebaseTripId}/expenses`, expense.id);
  
  // 🚨 SANITIZE BEFORE WRITING
  const safeData = sanitizeForFirestore({ ...expense, status: 'active' });
  batch.set(expRef, safeData, { merge: true });
  
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });

  await batch.commit();
}

// 2. SOFT DELETE EXPENSE (Audit Trail)
export async function cloudDeleteExpense(firebaseTripId: string, expenseId: string, userEmail: string) {
  const batch = writeBatch(db);
  const expRef = doc(db, `trips/${firebaseTripId}/expenses`, expenseId);
  
  // 🚨 SANITIZE BEFORE WRITING
  const safeData = sanitizeForFirestore({ status: 'deleted', deletedBy: userEmail, updatedAt: Date.now() });
  batch.set(expRef, safeData, { merge: true });

  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });

  await batch.commit();
}

// 3. SETTLE ALL (Archive)
export async function cloudSettleAll(firebaseTripId: string, activeExpenses: Expense[]) {
  const batch = writeBatch(db);
  
  activeExpenses.forEach(exp => {
    const expRef = doc(db, `trips/${firebaseTripId}/expenses`, exp.id);
    // 🚨 SANITIZE BEFORE WRITING
    const safeData = sanitizeForFirestore({ isSettled: true, updatedAt: Date.now() });
    batch.set(expRef, safeData, { merge: true });
  });
  
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });
  
  await batch.commit();
}

// 4. BULK CLOUD SAVE (Partial Settlements & Merging)
export async function cloudBulkUpdateExpenses(firebaseTripId: string, updatedExpenses: Expense[]) {
  const batch = writeBatch(db);
  
  updatedExpenses.forEach(exp => {
    const expRef = doc(db, `trips/${firebaseTripId}/expenses`, exp.id);
    // 🚨 SANITIZE BEFORE WRITING
    const safeData = sanitizeForFirestore({ ...exp, status: 'active' });
    batch.set(expRef, safeData, { merge: true });
  });

  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, { updatedAt: Date.now() }, { merge: true });

  await batch.commit();
}

// 5. SYNC GROUP METADATA (Settings, Roles, Name, Toggles, Members)
export async function cloudUpdateGroup(firebaseTripId: string, updates: Partial<Group>) {
  const tripRef = doc(db, 'trips', firebaseTripId);
  
  // Strip out expenses because they live in a subcollection
  const { expenses, id, firebaseTripId: _, ...safeUpdates } = updates as any;
  
  // 🚨 SANITIZE BEFORE WRITING
  const safeData = sanitizeForFirestore({ ...safeUpdates, updatedAt: Date.now() });
  
  await setDoc(tripRef, safeData, { merge: true });
}

// 6. END COLLABORATION (Wipe from Cloud)
// Note: No sanitization needed here because we are only deleting documents, not writing them.
export async function cloudEndCollaboration(firebaseTripId: string) {
  const expensesRef = collection(db, `trips/${firebaseTripId}/expenses`);
  const expSnap = await getDocs(expensesRef);
  
  const batch = writeBatch(db);
  expSnap.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.delete(tripRef);

  await batch.commit();
}




// 🚨 RESTORED: ATOMIC GHOST MERGE
// Guarantees that the Member List and the altered Expenses update at the exact same millisecond in the cloud.
export async function cloudExecuteMerge(firebaseTripId: string, updatedMembers: Member[], modifiedExpenses: Expense[]) {
  const batch = writeBatch(db);
  
  // 1. Sanitize and Update the members array on the root trip doc
  const tripRef = doc(db, 'trips', firebaseTripId);
  const safeTripData = sanitizeForFirestore({ members: updatedMembers, updatedAt: Date.now() });
  batch.set(tripRef, safeTripData, { merge: true });

  // 2. Sanitize and Update ONLY the expenses that were actually altered by the merge
  modifiedExpenses.forEach(exp => {
    const expRef = doc(db, `trips/${firebaseTripId}/expenses`, exp.id);
    const safeExpenseData = sanitizeForFirestore({ ...exp, updatedAt: Date.now(), status: 'active' });
    batch.set(expRef, safeExpenseData, { merge: true });
  });

  await batch.commit();
}
