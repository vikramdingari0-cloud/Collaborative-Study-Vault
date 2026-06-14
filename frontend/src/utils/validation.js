/** Matches backend authValidator password rules */
export const PASSWORD_RULES = {
  minLength: 8,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  hint: "At least 8 characters with uppercase, lowercase, and a number.",
};

export const validatePassword = (password) => {
  if (!password || password.length < PASSWORD_RULES.minLength) {
    return `Password must be at least ${PASSWORD_RULES.minLength} characters.`;
  }
  if (!PASSWORD_RULES.pattern.test(password)) {
    return PASSWORD_RULES.hint;
  }
  return "";
};

export const validateEmail = (email) => {
  if (!email?.trim()) return "Email is required.";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "Please enter a valid email address.";
  return "";
};
