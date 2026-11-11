import { db } from './firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { Group } from '../store';
import { sanitizeForFirestore } from './sanitize'; // 🚨 IMPORT THE SANITIZER

export async function createLiveTripInFirestore(group: Group, durationDays: number, adminEmail: string) {
  const firebaseTripId = `live_${crypto.randomUUID().replace(/-/g, '')}`;
  
  const expiresAtMillis = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
  const expiresAtDate = new Date(expiresAtMillis);

  const batch = writeBatch(db);

  // 1. Prepare the Root Trip Document
  const rawTripData = {
    name: group.name,
    createdAt: group.createdAt,
    expiresAt: expiresAtDate,
    members: group.members,
    roles: { admin: [adminEmail], editor: [], viewer: [] },
    // Carry over optional settings if they exist
    isFundEnabled: group.isFundEnabled,
    isFundClosed: group.isFundClosed
  };

  // 🚨 SANITIZE BEFORE WRITING! (Strips out all undefined values like ghost member emails)
  const safeTripData = sanitizeForFirestore(rawTripData);
  
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, safeTripData);

  // 2. Prepare the Expenses Subcollection
  group.expenses.forEach(exp => {
    const expRef = doc(db, `trips/${firebaseTripId}/expenses`, exp.id);
    
    const rawExpenseData = { 
      ...exp, 
      status: 'active', 
      createdByEmail: exp.createdByEmail || adminEmail // Ensure audit trail
    };

    // 🚨 SANITIZE BEFORE WRITING!
    const safeExpenseData = sanitizeForFirestore(rawExpenseData);
    
    batch.set(expRef, safeExpenseData);
  });

  await batch.commit();

  return { firebaseTripId, expiresAt: expiresAtMillis };
}