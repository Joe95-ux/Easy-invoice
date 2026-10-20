declare module "qrcode" {
  const QRCode: {
    toDataURL(
      text: string,
      options?: {
        errorCorrectionLevel?: "L" | "M" | "Q" | "H";
        margin?: number;
        width?: number;
        color?: { dark?: string; light?: string };
      },
    ): Promise<string>;
    create(
      text: string,
      options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" },
    ): {
      modules: {
        size: number;
        get(row: number, col: number): boolean;
      };
    };
  };
  export default QRCode;
}
