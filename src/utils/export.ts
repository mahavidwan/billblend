import type { Group } from '../store';

export function exportGroupToCSV(group: Group) {
  let csvContent = `Trip Name:,${group.name}\n`;
  csvContent += `Created On:,${new Date(group.createdAt).toLocaleDateString()}\n\n`;
  csvContent += 'Date,Description,Amount,Paid By,Split Type,Marked as Settled\n';
  
  group.expenses.forEach(exp => {
    const date = new Date(exp.date).toLocaleDateString();
    const safeDesc = `"${exp.description.replace(/"/g, '""')}"`;
    const paidByName = group.members.find(m => m.id === exp.paidBy)?.name || 'Unknown';
    const splitFormat = exp.splitType.replace('_', ' ');
    const isSettled = exp.isSettled ? 'Yes' : 'No';
    csvContent += `${date},${safeDesc},${exp.amount},${paidByName},${splitFormat},${isSettled}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${group.name.replace(/\s+/g, '_')}_Expenses.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- JSON EXPORT ENGINE WITH TIMESTAMP ---
export function exportGroupToJSON(group: Group) {
  const jsonData = JSON.stringify(group, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Generate timestamp (e.g. 2026-11-05_14-30)
  const now = new Date();
  const datePart = now.toISOString().split('T')[0];
  const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-').slice(0, 5);
  const timestamp = `${datePart}_${timePart}`;
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  // File name: Darjeeling_Trip_Backup_2026-11-05_14-30.json
  link.setAttribute('download', `${group.name.replace(/\s+/g, '_')}_Backup_${timestamp}.json`);
  
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}