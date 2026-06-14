/**
 * Extract a user-friendly error message from an Axios API error.
 */
export const getApiErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;

  if (data.errors?.length > 0) {
    return data.errors.map((e) => e.message).join(" ");
  }

  return data.message || fallback;
};

/**
 * Map validation errors to form field keys.
 */
export const getFieldErrors = (err) => {
  const errors = err?.response?.data?.errors;
  if (!errors?.length) return {};

  return errors.reduce((acc, item) => {
    if (item.field) acc[item.field] = item.message;
    return acc;
  }, {});
};
