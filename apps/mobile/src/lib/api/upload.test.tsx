import { describe, expect, it } from "@jest/globals";

import { fileFormData } from "./upload";

describe("envoi d'un fichier du téléphone", () => {
  it("met dans le corps un Blob lu depuis le disque, pas l'objet { uri, name, type }", () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const opened: string[] = [];
    const body = fileFormData(
      { uri: "file:///cache/avatar.png", name: "avatar.png", type: "image/png" },
      (uri) => {
        opened.push(uri);
        return blob;
      },
    );
    expect(opened).toEqual(["file:///cache/avatar.png"]);
    const part =
      (body as unknown as { getParts?: () => unknown[] }).getParts?.()[0] ?? body.get("file");
    expect(JSON.stringify(part)).not.toContain('"uri"');
  });
});
