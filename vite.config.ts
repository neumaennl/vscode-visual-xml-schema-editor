import { statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** Size above which the build warns about a file of the webview, as webpack's performance hints did. */
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Warns about files of the webview that are larger than MAX_FILE_SIZE, measured as
 * written, including the inline source map. Vite's own warning
 * (`build.chunkSizeWarningLimit`) is not available in library mode.
 *
 * @returns The plugin
 */
function warnLargeFiles(): Plugin {
  return {
    name: "warn-large-files",
    writeBundle(options, bundle): void {
      for (const fileName of Object.keys(bundle)) {
        const size = statSync(join(options.dir ?? "", fileName)).size;
        if (size > MAX_FILE_SIZE) {
          this.warn(`${fileName} is ${Math.round(size / 1024)} KiB, more than ${MAX_FILE_SIZE / 1024} KiB.`);
        }
      }
    },
  };
}

// Builds the webview into webview/main.js and webview/styles.css, the fixed names that
// the extension host loads with asWebviewUri(). The CSP of the webview allows only
// scripts with a nonce, so the bundle is one ES module without chunks or imports.
export default defineConfig(({ mode }) => ({
  // Not a web app: no index.html and no public folder.
  publicDir: false,
  plugins: [warnLargeFiles()],
  build: {
    outDir: "webview",
    emptyOutDir: true,
    // Inline in every build: the CSP (default-src 'none') blocks loading a separate .map
    // file, and the map makes stack traces from bug reports readable. warnLargeFiles()
    // keeps an eye on the size.
    sourcemap: "inline",
    minify: mode === "production",
    // styles.css is small and loaded from disk; it stays as written.
    cssMinify: false,
    lib: {
      entry: fileURLToPath(new URL("webview-src/main.ts", import.meta.url)),
      formats: ["es"],
      fileName: (): string => "main.js",
      cssFileName: "styles",
    },
  },
}));
