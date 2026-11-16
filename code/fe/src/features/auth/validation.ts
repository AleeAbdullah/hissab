// A quick shape check so obvious typos show inline; the API still validates the address.
export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
