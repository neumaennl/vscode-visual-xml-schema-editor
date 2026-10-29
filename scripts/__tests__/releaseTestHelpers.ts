// Helpers for the tests of the scripts.
import type { Mock } from "vitest";

/**
 * Replaces `fetch` with a mock that answers each URL with the given body, and
 * every other URL with HTTP 404. Undo it with `vi.unstubAllGlobals()`.
 *
 * @param bodies - The response body per URL; objects are sent as JSON, strings as text
 * @returns The mock of `fetch`
 */
export function stubFetch(bodies: Record<string, object | string>): Mock {
  const fetchMock = vi.fn((url: string) => {
    if (!(url in bodies)) {
      return Promise.resolve({ ok: false, status: 404 });
    }
    const body = bodies[url];
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/**
 * Creates a VS Code release as the GitHub releases API returns it.
 *
 * @param tag - The tag name, for example `1.125.0`
 * @param flags - Whether the release is a draft or a pre-release
 * @returns The release
 */
export function release(tag: string, flags: { draft?: boolean; prerelease?: boolean } = {}): object {
  return { tag_name: tag, published_at: "2026-06-17T14:59:29Z", draft: false, prerelease: false, ...flags };
}

/**
 * Returns the URL of a page of VS Code releases in the GitHub API.
 *
 * @param page - The page number, starting at 1
 * @returns The URL
 */
export function releasesPage(page: number): string {
  return `https://api.github.com/repos/microsoft/vscode/releases?per_page=100&page=${page}`;
}
