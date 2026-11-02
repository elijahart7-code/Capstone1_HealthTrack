export function calculateAge(birthdate) {
  const dob = typeof birthdate === "string" ? new Date(birthdate) : birthdate;
  const today = new Date();

  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) {
    return 0;
  }

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}
