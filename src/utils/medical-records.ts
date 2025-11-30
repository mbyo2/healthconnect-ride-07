export const generateMockRecordHash = (): string => {
  return (
    '0x' +
    Array(64)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('')
  );
};
