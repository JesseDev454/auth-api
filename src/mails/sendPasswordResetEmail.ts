export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  console.info(`[mail-placeholder] Password reset email queued for ${email}.`);
};
