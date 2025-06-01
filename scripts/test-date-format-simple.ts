// Test script for simple date formatting
const formatDateDDMMYY = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(2);
  return `${day}:${month}:${year}`;
};

// Create test dates
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

console.log('Original date (today):', today.toISOString());
console.log('Formatted date (DD:MM:YY):', formatDateDDMMYY(today));

console.log('\nOriginal date (tomorrow):', tomorrow.toISOString());
console.log('Formatted date (DD:MM:YY):', formatDateDDMMYY(tomorrow));

// Test with a specific date (June 4, 2025)
const specificDate = new Date('2025-06-04T00:00:00.000Z');
console.log('\nOriginal date (June 4, 2025):', specificDate.toISOString());
console.log('Formatted date (DD:MM:YY):', formatDateDDMMYY(specificDate));

// Now let's simulate the overlap check
const currentSub = {
  startDate: new Date('2025-06-01T00:00:00.000Z'), 
  endDate: new Date('2025-06-02T00:00:00.000Z')
};

const requestedBookingStart = new Date('2025-06-04T00:00:00.000Z');
const requestedBookingEnd = new Date('2025-06-05T00:00:00.000Z');

// Check if there's an overlap using our fixed logic
const isOverlap = requestedBookingStart < currentSub.endDate && requestedBookingEnd > currentSub.startDate;

console.log('\nTesting overlap logic:');
console.log('Current subscription:', formatDateDDMMYY(currentSub.startDate), 'to', formatDateDDMMYY(currentSub.endDate));
console.log('Requested booking:', formatDateDDMMYY(requestedBookingStart), 'to', formatDateDDMMYY(requestedBookingEnd));
console.log('Is there an overlap?', isOverlap ? 'Yes' : 'No');

// Now let's test the scenario in the bug report (June 3 should not overlap with June 1-2)
const bugTestBookingStart = new Date('2025-06-03T00:00:00.000Z');
const bugTestBookingEnd = new Date('2025-06-04T00:00:00.000Z');

const bugIsOverlap = bugTestBookingStart < currentSub.endDate && bugTestBookingEnd > currentSub.startDate;

console.log('\nTesting bug scenario:');
console.log('Current subscription:', formatDateDDMMYY(currentSub.startDate), 'to', formatDateDDMMYY(currentSub.endDate));
console.log('Requested booking:', formatDateDDMMYY(bugTestBookingStart), 'to', formatDateDDMMYY(bugTestBookingEnd));
console.log('Is there an overlap?', bugIsOverlap ? 'Yes' : 'No');
