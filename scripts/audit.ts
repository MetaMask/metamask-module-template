/* eslint-disable n/no-sync */

import { spawn } from 'node:child_process';
import type { ChannelListener } from 'node:diagnostics_channel';
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Permissions that are a plain on/off switch in the generated config, keyed by
// the permission name the audit channels report.
const BOOLEAN_FLAGS = {
  ChildProcess: '--allow-child-process',
  Net: '--allow-net',
  WorkerThreads: '--allow-worker',
  Addon: '--allow-addons',
  WASI: '--allow-wasi',
  Inspector: '--allow-inspector',
  FFI: '--allow-ffi',
};

// Environment variables worth expressing paths in terms of, most specific
// first. Anything matching one of these keeps the config portable across
// machines and CI runners.
const ENV_TOKENS = [
  'GITHUB_STEP_SUMMARY',
  'GITHUB_OUTPUT',
  'GITHUB_ENV',
  'GITHUB_PATH',
  'GITHUB_WORKSPACE',
  'RUNNER_TEMP',
  'RUNNER_TOOL_CACHE',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'npm_config_cache',
  'YARN_CACHE_FOLDER',
  'TMPDIR',
  'HOME',
];

// `lavamoat/.runner-plugin.js` expands an environment variable only when it is
// the entire value (`/^\$([A-Z_][A-Z0-9_]*)$/i`), so `$HOME/.cache` would reach
// Node as a literal path. Grants are therefore always a bare token, even though
// that is broader than the path that earned it. The causing path is reported
// alongside, so the widening is reviewable.

// The runner plugin sets `--allow-fs-tmp` whenever `--permission` is on, which
// appends the temporary directory to `--allow-fs-write` cross-platform. Emitting
// it again here would be redundant noise.
const RUNNER_PROVIDED_WRITES = new Set(['$TMPDIR']);

// Files that module and workspace resolution probes for while walking from the
// project directory up to the file system root. The hits are almost all misses,
// but they are still audited, and granting each one would bake this machine's
// directory layout into the config.
const RESOLUTION_MARKERS = new Set([
  // Module and workspace resolution.
  '.git',
  '.npmrc',
  '.yarnrc.yml',
  'jsconfig.json',
  'lerna.json',
  'node_modules',
  'package-lock.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'yarn.lock',
  // Tools that search for their own configuration the same way.
  '.browserslistrc',
  '.editorconfig',
  'browserslist',
  'browserslist.config.js',
  'browserslist.config.mjs',
]);

const AUDIT_DIRECTORY = mkdtempSync(join(tmpdir(), 'permission-audit-'));
const AUDIT_LOG = join(AUDIT_DIRECTORY, 'permissions.ndjson');

// macOS and Windows resolve paths case-insensitively, and tools like
// TypeScript probe with inconsistent casing. Comparing case-sensitively there
// would leak absolute machine paths into the config as unmatched outsiders.
const CASE_INSENSITIVE =
  process.platform === 'darwin' || process.platform === 'win32';

/**
 * The command line options this script was invoked with.
 */
type Options = {
  /**
   * The `package.json` script to audit.
   */
  scriptName: string;

  /**
   * Where to write the generated config, or `undefined` to write it to
   * standard output.
   */
  outPath: string | undefined;

  /**
   * Whether to show the audited script's own output and explain how each grant
   * was chosen, rather than printing the config alone.
   */
  verbose: boolean;
};

/**
 * A directory that absolute paths are rewritten relative to, turning a machine
 * specific path into a portable grant.
 */
type Prefix = {
  /**
   * The absolute path to match, normalised for comparison.
   */
  prefix: string;

  /**
   * What to rewrite a matching path to, such as `./` or `$HOME`.
   */
  token: string;
};

/**
 * The payload published on a `node:permission-model:*` channel. Unlike
 * {@link AuditRecord}, the permission arrives as a bare string, since the
 * channel makes no guarantee about which names it may add.
 */
type PermissionMessage = {
  /**
   * Which permission was checked.
   */
  permission: string;

  /**
   * The resource it applied to, if any.
   */
  resource: string;
};

/**
 * A single permission grant, along with why it ended up that broad.
 */
type Grant = {
  /**
   * The grant as it will appear in the generated config.
   */
  grant: string;

  /**
   * Where the path sits: `project`, `token`, `probe`, or `outside`.
   */
  kind: string;
};

/**
 * One permission check, as published by the audit channels and appended to the
 * log by the collector.
 */
type AuditRecord = {
  /**
   * The process that exercised the permission.
   */
  pid: string;

  /**
   * That process's arguments, used to attribute the record when reporting.
   */
  argv: string;

  /**
   * Which permission was checked.
   */
  permission:
    | 'Addon'
    | 'ChildProcess'
    | 'FFI'
    | 'FileSystemRead'
    | 'FileSystemWrite'
    | 'FileSystem'
    | 'Inspector'
    | 'Net'
    | 'WorkerThreads'
    | 'WASI';

  /**
   * The path, host, or command it applied to. Empty for the permissions that
   * are a plain on/off switch, such as `WorkerThreads`.
   */
  resource: string;
};

/**
 * A grant that had to reach outside the project, kept so that a widened config
 * is never silent about why it was widened.
 */
type Escape = {
  /**
   * Whether the grant was needed for reading or for writing.
   */
  action: 'read' | 'write';

  /**
   * The grant that was emitted.
   */
  grant: string;

  /**
   * How many audited paths collapsed into this same grant.
   */
  count: number;

  /**
   * One of the paths responsible, shown as an example.
   */
  cause: string;
};

/**
 * What the audit records add up to: a description of everything the script
 * actually did, before any of it is turned into a config.
 */
type Summary = {
  /**
   * The paths the script read, already generalised into portable grants.
   */
  reads: Set<string>;

  /**
   * The paths the script wrote, already generalised into portable grants.
   */
  writes: Set<string>;

  /**
   * The `--allow-*` flags for the permissions that are a plain on/off switch.
   */
  flags: Set<string>;

  /**
   * The hosts the script connected to. Not expressible in the config, which
   * treats networking as a single switch, but useful when reviewing it.
   */
  hosts: Set<string>;

  /**
   * The commands the script spawned, useful for the same reason as the hosts.
   */
  commands: Set<string>;

  /**
   * Every grant that reached outside the project, keyed by action and grant.
   */
  escapes: Map<string, Escape>;
};

/**
 * A generated LavaMoat script config.
 */
type Config = {
  /**
   * How the config was produced and how far it can be trusted.
   */
  notes: string;

  /**
   * The flags to run the script with.
   */
  nodeOptions: Record<string, string | boolean | string[]>;
};

/**
 * Normalise a path for comparison on the current platform. Length is
 * preserved, so offsets taken from a comparison key still apply to the
 * original path.
 *
 * @param path - The path to normalise.
 * @returns The comparison key.
 */
function comparable(path: string): string {
  return CASE_INSENSITIVE ? path.toLowerCase() : path;
}

/**
 * Compare two strings by code unit, for sorting.
 *
 * `localeCompare` is deliberately not used here. It orders by locale rules,
 * which weight punctuation and case differently from one machine to the next,
 * so `/` and `$TMPDIR` can swap places depending on who ran the script. Both
 * the generated config and the report get committed and diffed, so their
 * ordering has to be identical everywhere rather than merely readable.
 *
 * @param a - The first string.
 * @param b - The second string.
 * @returns A negative number if `a` sorts first, a positive number if `b`
 * does, and zero if they are equal.
 */
function compareStrings(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

/**
 * Resolve a path to its canonical form, tolerating paths that no longer exist.
 *
 * @param path - The path to resolve.
 * @returns The canonical path, or the original on failure.
 */
function canonical(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

/**
 * Build the prefix table used to rewrite absolute paths into portable tokens,
 * longest first so the most specific prefix wins.
 *
 * @returns The prefix table.
 */
function buildPrefixes(): Prefix[] {
  const prefixes: Prefix[] = [];

  /**
   * Register a path and its canonical form under the same token.
   *
   * @param path - The path to register.
   * @param token - The token to rewrite it to.
   */
  const add = (path: string | undefined, token: string): void => {
    if (!path || !isAbsolute(path)) {
      return;
    }

    for (const variant of new Set([resolve(path), canonical(path)])) {
      prefixes.push({ prefix: comparable(variant), token });
    }
  };

  // The project directory has to win over `$HOME`, which contains it. Ordering
  // by length below takes care of that.
  add(process.cwd(), './');

  for (const name of ENV_TOKENS) {
    // eslint-disable-next-line n/no-process-env
    add(process.env[name], `$${name}`);
  }

  add(tmpdir(), '$TMPDIR');
  add(homedir(), '$HOME');

  return prefixes.sort((a, b) => b.prefix.length - a.prefix.length);
}

const PREFIXES = buildPrefixes();

/**
 * Build the set of directories between the project and the filesystem root.
 *
 * @returns Every strict ancestor of the project directory.
 */
function buildAncestors(): Set<string> {
  const ancestors = new Set<string>();

  let directory = process.cwd();
  let parent = dirname(directory);

  while (parent !== directory) {
    ancestors.add(comparable(parent)).add(comparable(canonical(parent)));
    directory = parent;
    parent = dirname(directory);
  }

  return ancestors;
}

const ANCESTORS = buildAncestors();

/**
 * Decide whether a path is module resolution walking up the directory tree
 * rather than a genuine dependency of the script.
 *
 * @param target - The resolved path from an audit record.
 * @returns True if the path is a resolution probe.
 */
function isResolutionProbe(target: string): boolean {
  const key = comparable(target);

  if (ANCESTORS.has(key)) {
    return true;
  }

  if (
    ANCESTORS.has(comparable(dirname(target))) &&
    RESOLUTION_MARKERS.has(comparable(basename(target)))
  ) {
    return true;
  }

  // Node walks every ancestor's `node_modules` looking for a dependency, so
  // those hits describe the machine's directory layout rather than the script.
  for (const ancestor of ANCESTORS) {
    const modules = join(ancestor, 'node_modules');
    if (key === modules || key.startsWith(modules + sep)) {
      return true;
    }
  }

  return false;
}

/**
 * Rewrite an absolute path into a portable, generalised grant.
 *
 * @param path - The absolute path from an audit record.
 * @param action - Whether the path was read or written. Resolution only ever
 * reads, so a write to one of those paths is a genuine write and must not be
 * widened to the whole file system.
 * @returns The classified grant, or undefined if the path is unusable.
 */
function generalise(path: string, action: 'read' | 'write'): Grant | undefined {
  if (!path || !isAbsolute(path)) {
    return undefined;
  }

  const target = resolve(path);

  if (action === 'read' && isResolutionProbe(target)) {
    return { grant: '/', kind: 'probe' };
  }

  const key = comparable(target);
  for (const { prefix, token } of PREFIXES) {
    if (key !== prefix && !key.startsWith(prefix + sep)) {
      continue;
    }

    if (token === './') {
      return { grant: './', kind: 'project' };
    }

    // A variable pointing at a single file (a GitHub summary, say) is the whole
    // grant on its own.
    if (key === prefix) {
      return { grant: token, kind: 'token' };
    }

    return { grant: token, kind: 'token' };
  }

  // Outside anything recognisable, grant the top-level directory rather than a
  // machine-specific path.
  //
  // On Windows this drops the drive, so `C:\Windows` becomes `/Windows`. That
  // is knowingly left alone: keeping the drive would put a path in the config
  // that means nothing on any other machine, and Windows has no portable
  // top-level namespace to rewrite it to. Such a grant needs a human anyway,
  // and it is reported as an escape so that it gets one.
  const [, top] = target.split(sep);
  return { grant: top ? `/${top}` : '/', kind: 'outside' };
}

/**
 * Subscribe to the permission audit channels and append everything they report
 * to the log named by `PERMISSION_AUDIT_LOG`.
 *
 * This runs in the audited process, not in this one. It is serialised with
 * `Function.prototype.toString` and injected via `--import`, so it must be
 * entirely self-contained: it cannot reference anything declared outside its
 * own body, and it has to reach for built-ins with dynamic `import` rather
 * than the static imports at the top of this file. Keeping it here as real
 * code, rather than as a string, is what lets it be linted and formatted
 * alongside everything else.
 *
 * @returns A promise that resolves once the channels are subscribed.
 */
async function collect(): Promise<void> {
  // eslint-disable-next-line n/no-process-env
  const logPath = process.env.PERMISSION_AUDIT_LOG;

  // Without a log path there is nothing to report to, so stay out of the way
  // entirely rather than half-instrumenting the process.
  if (!logPath) {
    return;
  }

  const { channel } = await import('node:diagnostics_channel');
  const { closeSync, openSync, writeSync } = await import('node:fs');

  const fd = openSync(logPath, 'a');

  // The collector's own bookkeeping shows up on the very channels it listens
  // to. Drop those events so the report describes the audited script, not the
  // auditor.
  const ignored = new Set([logPath]);

  let writing = false;

  /**
   * Append a single permission record to the shared audit log.
   *
   * @param permission - The permission being exercised.
   * @param resource - The resource it applies to, if any.
   */
  const write = (permission: string, resource: string): void => {
    if (writing || ignored.has(resource)) {
      return;
    }

    writing = true;
    try {
      // O_APPEND writes below PIPE_BUF are atomic, so sibling processes can
      // share this file without locking. Synchronous keeps the record durable
      // even if the process dies before `exit` handlers run.
      writeSync(
        fd,
        `${JSON.stringify({
          pid: process.pid,
          argv: process.argv.slice(1),
          permission,
          resource,
        })}\n`,
      );
    } catch {
      // A broken audit log must never take down the audited script.
    } finally {
      writing = false;
    }
  };

  /**
   * Forward a published permission check to the audit log. The same listener
   * serves every channel, since the payload identifies the permission.
   *
   * @param message - The payload the channel published.
   */
  const listener: ChannelListener = (message: unknown): void => {
    const { permission, resource } = message as PermissionMessage;

    write(permission, resource);
  };

  for (const name of [
    'fs',
    'net',
    'child',
    'worker',
    'inspector',
    'wasi',
    'addon',
    'ffi',
  ]) {
    channel(`node:permission-model:${name}`).subscribe(listener);
  }

  process.on('exit', () => {
    closeSync(fd);
  });
}

// `--import` evaluates this before the entry point, and awaits top-level await,
// so the channels are subscribed before the audited script can touch anything.
const COLLECTOR_URL = `data:text/javascript,${encodeURIComponent(
  `await (${collect.toString()})()`,
)}`;

/**
 * Run the audited script and resolve with its exit status.
 *
 * @param scriptName - The name of the script to run.
 * @param verbose - Whether to include verbose output.
 * @param logPath - Where the collector should append records.
 * @returns The exit code.
 */
async function runScript(
  scriptName: string,
  verbose: boolean,
  logPath: string,
): Promise<number> {
  return new Promise((resolveRun) => {
    const flags = [
      '--permission-audit',
      '--disable-warning=SecurityWarning',
      `--import ${COLLECTOR_URL}`,
    ];

    const child = spawn('node', ['--run', scriptName], {
      // The audited script's output is noise next to the generated config, so
      // it is discarded unless it was asked for. Nothing is buffered, so a
      // chatty script cannot blow up memory here.
      stdio: verbose ? 'inherit' : 'ignore',
      env: {
        // eslint-disable-next-line n/no-process-env
        ...process.env,
        PERMISSION_AUDIT_LOG: logPath,
        NODE_OPTIONS: flags.join(' '),
      },
    });

    child.on('close', (code, signal) => resolveRun(signal ? 1 : (code ?? 0)));
  });
}

/**
 * Read every record written during a pass.
 *
 * @param logPath - The log to read.
 * @returns The parsed records.
 */
function readRecords(logPath: string): AuditRecord[] {
  let contents;
  try {
    contents = readFileSync(logPath, 'utf8');
  } catch {
    return [];
  }

  return contents
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      // A process killed mid-write can leave a partial final line behind.
      try {
        return [JSON.parse(line) as AuditRecord];
      } catch {
        return [];
      }
    });
}

/**
 * Collapse a set of grants, dropping entries made redundant by a broader one.
 *
 * @param grants - The grants to collapse.
 * @returns The sorted, collapsed grants.
 */
function collapse(grants: Set<string>): string[] {
  if (grants.has('/')) {
    return ['/'];
  }

  // Prefer the project-relative grant first; it is the one reviewers care about.
  const sorted = [...grants].sort((a, b) => {
    if (a === './') {
      return -1;
    }

    if (b === './') {
      return 1;
    }

    return compareStrings(a, b);
  });

  return sorted.filter(
    (grant) =>
      !sorted.some((other) => other !== grant && grant.startsWith(`${other}/`)),
  );
}

/**
 * Parse the command line arguments.
 *
 * @returns The options the script was invoked with.
 */
async function parseArgv(): Promise<Options> {
  const {
    script: scriptName,
    out: outPath,
    verbose,
  } = await yargs(hideBin(process.argv))
    .command('$0 <script>', 'Audit the permissions a package script needs.')
    .positional('script', {
      describe: 'The `package.json` script to audit.',
      type: 'string',
      demandOption: true,
    })
    .option('out', {
      describe: 'Write the config to this file instead of standard output.',
      type: 'string',
    })
    .option('verbose', {
      describe:
        "Show the audited script's own output, and explain how each grant was chosen.",
      type: 'boolean',
      default: false,
    })
    .strict()
    .parseAsync();

  return {
    scriptName,
    outPath,
    verbose,
  };
}

/**
 * Reduce the raw audit records to the set of permissions the script exercised.
 *
 * This describes what happened, and deliberately stops short of deciding what
 * to grant, which {@link buildConfig} handles.
 *
 * @param records - Every record the collector wrote.
 * @returns The summarised permissions.
 */
function summarise(records: AuditRecord[]): Summary {
  const summary: Summary = {
    reads: new Set<string>(),
    writes: new Set<string>(),
    flags: new Set<string>(),
    hosts: new Set<string>(),
    commands: new Set<string>(),
    escapes: new Map<string, Escape>(),
  };

  /**
   * Note that a grant reached outside the project.
   *
   * @param action - Whether the grant was for reading or writing.
   * @param grant - The grant that was emitted.
   * @param cause - The path responsible.
   */
  const noteEscape = (
    action: 'read' | 'write',
    grant: string,
    cause: string,
  ): void => {
    const key = `${action} ${grant}`;
    const existing = summary.escapes.get(key);

    summary.escapes.set(key, {
      action,
      grant,
      count: (existing?.count ?? 0) + 1,
      cause: existing?.cause ?? cause,
    });
  };

  for (const { permission, resource } of records) {
    switch (permission) {
      case 'FileSystemRead': {
        const read = generalise(resource, 'read');
        if (read) {
          summary.reads.add(read.grant);
          if (read.kind !== 'project') {
            noteEscape('read', read.grant, resource);
          }
        }
        break;
      }

      case 'FileSystemWrite': {
        const written = generalise(resource, 'write');
        if (written) {
          summary.writes.add(written.grant);
          if (written.kind !== 'project') {
            noteEscape('write', written.grant, resource);
          }
        }
        break;
      }

      case 'FileSystem':
        // `fs.symlink` publishes this alongside ordinary read and write records
        // for both of its paths, so the specific grants above already cover it.
        break;

      default:
        break;
    }

    const flag = BOOLEAN_FLAGS[permission as keyof typeof BOOLEAN_FLAGS];
    if (flag) {
      summary.flags.add(flag);
    }

    if (permission === 'Net' && resource) {
      summary.hosts.add(resource);
    }

    if (permission === 'ChildProcess' && resource) {
      summary.commands.add(resource);
    }
  }

  return summary;
}

/**
 * Turn a summary into the config that grants exactly those permissions.
 *
 * @param summary - What the audited script exercised.
 * @param scriptName - The script that was audited, named in the notes.
 * @param exitCode - The script's exit code, since a script that stopped early
 * cannot have exercised everything it needs.
 * @returns The config.
 */
function buildConfig(
  summary: Summary,
  scriptName: string,
  exitCode: number,
): Config {
  // Reads have to cover writes, and the project directory is always readable.
  const reads = new Set([...summary.reads, ...summary.writes, './']);

  // The runner grants the temporary directory for writing only, so a tmp read
  // still has to be requested above.
  const writes = new Set(summary.writes);
  for (const grant of RUNNER_PROVIDED_WRITES) {
    writes.delete(grant);
  }

  const nodeOptions: Config['nodeOptions'] = {
    '--disable-warning': 'SecurityWarning',
    '--permission': true,
    '--allow-fs-read': collapse(reads),
    '--allow-fs-write': collapse(writes),
  };

  for (const flag of Object.values(BOOLEAN_FLAGS)) {
    nodeOptions[flag] = summary.flags.has(flag);
  }

  const incomplete =
    exitCode === 0
      ? ''
      : ` The audited run exited with ${exitCode} before completing, so these permissions are likely incomplete.`;

  return {
    notes: `Generated from a --permission-audit run of \`${scriptName}\`. Review before use: grants are widened to the nearest portable path, so they may be broader than strictly required.${incomplete}`,
    nodeOptions,
  };
}

/**
 * Report the detail that does not fit the config format, but matters when
 * reviewing it.
 *
 * @param summary - What the audited script exercised.
 */
function report(summary: Summary): void {
  const details: [label: string, values: Set<string>][] = [
    ['network hosts', summary.hosts],
    ['child commands', summary.commands],
  ];

  if (details.some(([, values]) => values.size > 0)) {
    console.error('\nObserved detail behind the boolean flags:');

    for (const [label, values] of details) {
      if (values.size > 0) {
        console.error(
          `  ${label}: ${[...values].sort(compareStrings).join(', ')}`,
        );
      }
    }
  }

  if (summary.escapes.size > 0) {
    console.error(
      '\nGrants reaching outside the project, with an example of the',
    );
    console.error('path that caused each one:');

    // Sorted by the same key the map is built from, so reads group before
    // writes and grants read in a stable order.
    const sorted = [...summary.escapes.entries()]
      .sort(([a], [b]) => compareStrings(a, b))
      .map(([, value]) => value);

    for (const { action, grant, count, cause } of sorted) {
      const more = count > 1 ? ` (+${count - 1} more)` : '';
      const provided =
        action === 'write' && RUNNER_PROVIDED_WRITES.has(grant)
          ? ' [omitted; the runner grants this]'
          : '';

      console.error(`  ${action} ${grant}  ${cause}${more}${provided}`);
    }
  }
}

/**
 * Audit the permissions a package script needs, and print or write a config
 * granting exactly those.
 */
async function main(): Promise<void> {
  const { scriptName, outPath, verbose } = await parseArgv();
  const exitCode = await runScript(scriptName, verbose, AUDIT_LOG);
  const records = readRecords(AUDIT_LOG);

  rmSync(AUDIT_DIRECTORY, { recursive: true, force: true });

  // A non-zero exit is not necessarily a problem with the audit: a linter
  // reporting findings or a failing test exits non-zero too. Either way the
  // script stopped early, so whatever it had not reached yet is missing from
  // the config.
  const complete = exitCode === 0;
  if (!complete) {
    console.error(
      `Script exited with ${exitCode}, so it may not have exercised every ` +
        `permission it needs. Fix the failure and re-run for a complete config.`,
    );

    // The output that would explain the failure was discarded, so point at the
    // flag that keeps it.
    if (!verbose) {
      console.error(
        `Re-run with --verbose to see the script's output and diagnose it.`,
      );
    }
  }

  const summary = summarise(records);
  const config = buildConfig(summary, scriptName, exitCode);
  const json = `${JSON.stringify(config, undefined, 2)}\n`;

  if (outPath) {
    writeFileSync(outPath, json);
    console.error(`Wrote ${outPath}`);
  } else {
    process.stdout.write(json);
  }

  if (verbose) {
    report(summary);
  }
}

await main();
