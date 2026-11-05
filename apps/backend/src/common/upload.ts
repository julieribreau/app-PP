/** Fichier reçu par FileInterceptor (multer, stockage mémoire). */
export type UploadedImage = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};
