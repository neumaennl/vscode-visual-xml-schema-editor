/**
 * Custom Vitest JUnit reporter matching jest-junit output format.
 *
 * Differences from the built-in Vitest JUnit reporter:
 * - One <testsuite> per top-level describe block (not per file)
 * - <testcase classname> = filename basename only (e.g. "commandExecutor.test.ts")
 * - <testcase name> = just the it()/test() title, no describe-path prefix
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative } from 'node:path';

interface ReporterOptions {
  outputFile?: string;
  suiteName?: string;
}

interface TestError {
  message?: string;
  name?: string;
  stack?: string;
}

interface TestResult {
  duration?: number;
  state?: 'pass' | 'fail' | 'skip';
  startTime?: number;
  errors?: TestError[];
}

interface TestTask {
  type: 'suite' | 'test' | 'custom';
  name: string;
  mode?: 'run' | 'skip' | 'todo';
  result?: TestResult;
  tasks?: TestTask[];
}

interface TestFileTask extends TestTask {
  filepath?: string;
}

interface TestModule {
  task?: TestFileTask;
}

interface SuiteBucket {
  name: string;
  classname: string;
  relPath: string;
  timestamp: string;
  duration: number;
  tests: TestTask[];
  isFileSuite?: boolean;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function secondsDuration(task: TestTask): string {
  const ms = task.result?.duration ?? 0;
  return (ms / 1000).toFixed(3);
}

function collectLeafTests(task: TestTask): TestTask[] {
  if (task.type === 'test' || task.type === 'custom') {
    return [task];
  }

  if (task.tasks?.length) {
    return task.tasks.flatMap(collectLeafTests);
  }

  return [];
}

export class JestCompatJUnitReporter {
  private readonly outputFile: string;

  private readonly suiteName: string;

  constructor(options: ReporterOptions = {}) {
    this.outputFile = options.outputFile ?? 'test-results/vitest-junit.xml';
    this.suiteName = options.suiteName ?? 'vitest tests';
  }

  onTestRunEnd(testModules: TestModule[]): void {
    const suites: SuiteBucket[] = [];

    for (const testModule of testModules) {
      const file = testModule.task;
      if (!file) {
        continue;
      }

      const relPath = relative(process.cwd(), file.filepath ?? '');
      const fileBasename = basename(relPath);
      const timestamp = new Date(file.result?.startTime ?? Date.now())
        .toISOString()
        .slice(0, 19);

      for (const topTask of file.tasks ?? []) {
        if (topTask.type === 'suite') {
          suites.push({
            name: topTask.name,
            classname: fileBasename,
            relPath,
            timestamp,
            duration: topTask.result?.duration ?? 0,
            tests: collectLeafTests(topTask),
          });
          continue;
        }

        if (topTask.type === 'test' || topTask.type === 'custom') {
          let fileSuite = suites.find(
            suite => suite.isFileSuite === true && suite.relPath === relPath,
          );

          if (!fileSuite) {
            fileSuite = {
              name: fileBasename,
              classname: fileBasename,
              relPath,
              timestamp,
              duration: 0,
              tests: [],
              isFileSuite: true,
            };
            suites.push(fileSuite);
          }

          fileSuite.tests.push(topTask);
          fileSuite.duration += topTask.result?.duration ?? 0;
        }
      }
    }

    const totalTests = suites.reduce((total, suite) => total + suite.tests.length, 0);
    const totalFailures = suites.reduce(
      (total, suite) =>
        total + suite.tests.filter(test => test.result?.state === 'fail').length,
      0,
    );
    const totalTime = testModules.reduce(
      (total, module) => total + (module.task?.result?.duration ?? 0),
      0,
    );

    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuites name="${escapeXml(this.suiteName)}" tests="${totalTests}" failures="${totalFailures}" errors="0" time="${(totalTime / 1000).toFixed(3)}">`,
    ];

    for (const suite of suites) {
      const failures = suite.tests.filter(test => test.result?.state === 'fail').length;
      const skipped = suite.tests.filter(
        test => test.mode === 'skip' || test.mode === 'todo',
      ).length;

      lines.push(
        `  <testsuite name="${escapeXml(suite.name)}" errors="0" failures="${failures}" skipped="${skipped}" timestamp="${suite.timestamp}" time="${(suite.duration / 1000).toFixed(3)}" tests="${suite.tests.length}">`,
      );

      for (const test of suite.tests) {
        lines.push(
          `    <testcase classname="${escapeXml(suite.classname)}" name="${escapeXml(test.name)}" time="${secondsDuration(test)}">`,
        );

        if (test.mode === 'skip' || test.mode === 'todo') {
          lines.push('      <skipped/>');
        }

        if (test.result?.state === 'fail') {
          for (const error of test.result.errors ?? []) {
            const message = escapeXml(error?.message ?? 'Test failed');
            const type = escapeXml(error?.name ?? 'Error');
            const stack = escapeXml(error?.stack ?? '');

            lines.push(`      <failure message="${message}" type="${type}">`);
            if (stack) {
              lines.push(`        ${stack}`);
            }
            lines.push('      </failure>');
          }
        }

        lines.push('    </testcase>');
      }

      lines.push('  </testsuite>');
    }

    lines.push('</testsuites>');

    mkdirSync(dirname(this.outputFile), { recursive: true });
    writeFileSync(this.outputFile, `${lines.join('\n')}\n`, 'utf-8');
  }
}
