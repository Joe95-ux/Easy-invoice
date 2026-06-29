import { toast } from "sonner";

type LoadingToastOptions = {
  loading: string;
  success: string;
  error?: string;
};

export async function runWithLoadingToast<T>(
  options: LoadingToastOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const id = toast.loading(options.loading);
  try {
    const result = await fn();
    toast.success(options.success, { id });
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : (options.error ?? "Something went wrong");
    toast.error(options.error ?? message, { id });
    throw error;
  }
}
