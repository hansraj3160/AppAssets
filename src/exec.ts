import { spawn } from "node:child_process";

export type ExecResult = { code: number; stdout: string; stderr: string };

const WIN_CMD_META_RE = /[&|<>^%!"\r\n]/;

export function exec(
  cmd: string,
  args: string[],
  opts: { cwd?: string; quiet?: boolean } = {},
): Promise<ExecResult> {
  if (typeof cmd !== "string" || !cmd.trim() || /[\0\r\n]/.test(cmd)) {
    return Promise.resolve({
      code: 126,
      stdout: "",
      stderr: "Invalid command executable",
    });
  }
  for (const arg of args) {
    if (typeof arg !== "string" || arg.includes("\0")) {
      return Promise.resolve({
        code: 126,
        stdout: "",
        stderr: "Invalid null byte in command argument",
      });
    }
  }

  return new Promise((res) => {
    // Node refuses to spawn .cmd/.bat shims without a shell on Windows;
    // on POSIX and all non-batch executables on Windows, shell is strictly false.
    const shell = process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd);
    if (shell && WIN_CMD_META_RE.test(cmd)) {
      res({ code: 126, stdout: "", stderr: "Unsafe characters in Windows batch command path" });
      return;
    }
    let argv: string[];
    try {
      argv = shell ? args.map(quoteForCmd) : args;
    } catch (err) {
      res({ code: 126, stdout: "", stderr: err instanceof Error ? err.message : String(err) });
      return;
    }
    const child = spawn(cmd, argv, { cwd: opts.cwd, shell, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
      if (!opts.quiet) process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      stderr += d;
      if (!opts.quiet) process.stderr.write(d);
    });
    // A missing binary surfaces as an 'error' event, not a non-zero exit.
    child.on("error", (err) => res({ code: 127, stdout, stderr: stderr + String(err) }));
    child.on("close", (code) => res({ code: code ?? 1, stdout, stderr }));
  });
}

/**
 * Escapes an argument safely for Windows cmd.exe when invoking .cmd/.bat shims.
 * Rejects CR/LF/NUL control characters (which act as command separators in cmd.exe)
 * and escapes cmd.exe metacharacters including %, !, ^, &, |, <, >, (, ), and ".
 */
export function quoteForCmd(arg: string): string {
  if (/[\0\r\n]/.test(arg)) {
    throw new Error("Command argument cannot contain NUL, CR, or LF characters");
  }
  const escaped = arg
    .replace(/\^/g, "^^")
    .replace(/"/g, '""')
    .replace(/%/g, "^%")
    .replace(/!/g, "^!")
    .replace(/[&|<>()]/g, "^$&");
  return /[\s^"&|<>()%!]/.test(arg) ? `"${escaped}"` : escaped;
}

export async function execOrThrow(
  cmd: string,
  args: string[],
  opts: { cwd?: string; quiet?: boolean } = {},
) {
  const r = await exec(cmd, args, { quiet: true, ...opts });
  if (r.code !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited ${r.code}\n${r.stderr || r.stdout}`);
  }
  return r;
}

/** First JSON value in a stream that may be prefixed with human-readable log lines. */
export function parseJsonTail<T = unknown>(out: string): T | null {
  const start = out.search(/[[{]/);
  if (start === -1) return null;
  for (let end = out.length; end > start; end--) {
    try {
      return JSON.parse(out.slice(start, end)) as T;
    } catch {
      /* keep shrinking */
    }
  }
  return null;
}
