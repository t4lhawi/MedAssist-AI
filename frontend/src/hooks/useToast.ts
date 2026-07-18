// Minimal stub: the original full toast system isn't shipped; provides the
// same surface used by SalleCard. Replace with a real toast layer later.
const noop = (_msg: string, _opts?: { type?: 'info' | 'success' | 'error' }) => {}
export const toast = {
  info: noop,
  success: noop,
  error: noop,
}
export function useToast() {
  return { toast }
}
