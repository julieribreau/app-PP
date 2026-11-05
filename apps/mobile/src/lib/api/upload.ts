import { File } from "expo-file-system";

export interface LocalFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Corps multipart d'un fichier du téléphone. Le `fetch` d'Expo (SDK 58) n'accepte plus l'objet
 * `{ uri, name, type }` de React Native (« Unsupported FormDataPart implementation ») : il lui
 * faut un `File` d'expo-file-system, qui lit le fichier sur le disque.
 */
export function fileFormData(file: LocalFile, open: (uri: string) => Blob = openFile): FormData {
  const body = new FormData();
  body.append("file", open(file.uri), file.name);
  return body;
}

function openFile(uri: string): Blob {
  // File d'expo-file-system implémente l'interface Blob sans en hériter.
  return new File(uri) as unknown as Blob;
}
