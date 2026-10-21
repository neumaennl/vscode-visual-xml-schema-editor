import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addExtensions, addExtensionsInFolder } from "./add-import-extensions.ts";

describe("add-import-extensions", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "import-extensions-"));
    mkdirSync(join(dir, "folder"));
    writeFileSync(join(dir, "a.ts"), "");
    writeFileSync(join(dir, "folder", "index.ts"), "");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("should add .js to imports and re-exports of files", () => {
    const source = `import { a } from './a';\nexport * from "./a";\nimport './a';\nconst m = await import('./a');`;

    expect(addExtensions(source, join(dir, "b.ts"))).toBe(
      `import { a } from './a.js';\nexport * from "./a.js";\nimport './a.js';\nconst m = await import('./a.js');`,
    );
  });

  it("should point imports of a folder to its index.js", () => {
    expect(addExtensions(`import { x } from './folder';`, join(dir, "b.ts"))).toBe(`import { x } from './folder/index.js';`);
  });

  it("should leave other imports unchanged", () => {
    const source = `import { a } from './a.js';\nimport { b } from 'package';\nimport { c } from './missing';\nimport d from './data.json';`;

    expect(addExtensions(source, join(dir, "b.ts"))).toBe(source);
  });

  it("should update the files of a folder and its subfolders", () => {
    writeFileSync(join(dir, "folder", "c.ts"), `import { a } from '../a';`);

    addExtensionsInFolder(dir);

    expect(readFileSync(join(dir, "folder", "c.ts"), "utf8")).toBe(`import { a } from '../a.js';`);
  });
});
