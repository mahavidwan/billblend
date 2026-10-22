import type { Group } from '../store';

export function exportGroupToCSV(group: Group) {
  // 1. Build the CSV Header
  let csvContent = `Trip Name:,${group.name}\n`;
  csvContent += `Created On:,${new Date(group.createdAt).toLocaleDateString()}\n\n`;

  // 2. Add Expenses Table
  csvContent += 'Date,Description,Amount,Paid By,Split Type,Marked as Settled\n';
  
  group.expenses.forEach(exp => {
    const date = new Date(exp.date).toLocaleDateString();
    // Escape quotes to prevent CSV breakage if description has commas
    const safeDesc = `"${exp.description.replace(/"/g, '""')}"`;
    const paidByName = group.members.find(m => m.id === exp.paidBy)?.name || 'Unknown';
    const splitFormat = exp.splitType.replace('_', ' ');
    const isSettled = exp.isSettled ? 'Yes' : 'No';

    csvContent += `${date},${safeDesc},${exp.amount},${paidByName},${splitFormat},${isSettled}\n`;
  });

  // 3. Trigger the Browser to Download the File
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  // Create a clean file name (e.g. Darjeeling_Trip_Expenses.csv)
  link.setAttribute('download', `${group.name.replace(/\s+/g, '_')}_Expenses.csv`);
  
  // Append, click, and remove to trigger silently
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}