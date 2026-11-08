import { db } from './firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { Group } from '../store';

export async function createLiveTripInFirestore(group: Group, durationDays: number, adminEmail: string) {
  // 1. Generate a unique, secure ID for the cloud trip
  const firebaseTripId = `live_${crypto.randomUUID().replace(/-/g, '')}`;
  
  // 2. Calculate the exact Expiration Date (TTL)
  const expiresAtMillis = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
  const expiresAtDate = new Date(expiresAtMillis);

  // 3. Create a Batch Write (so if internet drops halfway, it rolls back cleanly)
  const batch = writeBatch(db);

  // 4. Create the Master Trip Document
  const tripRef = doc(db, 'trips', firebaseTripId);
  batch.set(tripRef, {
    name: group.name,
    createdAt: group.createdAt,
    expiresAt: expiresAtDate, // Firestore TTL will use this field to auto-delete
    members: group.members,
    roles: {
      admin: [adminEmail] // Advanced RBAC: You are the Admin!
    }
  });

  // 5. Dump all existing expenses into a Subcollection
  // This allows Git-like real-time syncing later without document conflicts
  group.expenses.forEach(exp => {
    const expRef = doc(db, `trips/${firebaseTripId}/expenses`, exp.id);
    batch.set(expRef, { 
      ...exp, 
      status: 'active', // For soft-deletes later
      createdBy: adminEmail 
    });
  });

  // 6. Execute the batch to the cloud!
  await batch.commit();

  return { firebaseTripId, expiresAt: expiresAtMillis };
}