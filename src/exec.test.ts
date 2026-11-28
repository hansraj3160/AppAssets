import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exec, execOrThrow, parseJsonTail, quoteForCmd } from "./exec.ts";

describe("exec", () => {
  it("captures stdout, stderr, exit codes, and cwd cleanly", async () => {
    const dir = await mkdtemp(join(tmpdir(), "appassets-exec-"));
    try {
      const ok = await exec(
        process.execPath,
        ["-e", "process.stdout.write('hello'); process.stderr.write('warn');"],
        { cwd: dir, quiet: true },
      );
      expect(ok.code).toBe(0);
      expect(ok.stdout).toBe("hello");
      expect(ok.stderr).toBe("warn");

      const cwdRes = await exec(process.execPath, ["-e", "process.stdout.write(process.cwd())"], {
        cwd: dir,
        quiet: true,
      });
      expect(cwdRes.code).toBe(0);
      expect(cwdRes.stdout.endsWith(dir.split("/").pop()!)).toBe(true);

      const fail = await exec(process.execPath, ["-e", "process.exit(42)"], { quiet: true });
      expect(fail.code).toBe(42);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns 127 for missing binaries and 126 for invalid command or NUL bytes", async () => {
    const missing = await exec("appassets-nonexistent-binary-99999", [], { quiet: true });
    expect(missing.code).toBe(127);
    expect(missing.stderr.length).toBeGreaterThan(0);

    const emptyCmd = await exec("   ", [], { quiet: true });
    expect(emptyCmd.code).toBe(126);
    expect(emptyCmd.stderr).toMatch(/Invalid command/i);

    const newlineCmd = await exec("echo\nwhoami", [], { quiet: true });
    expect(newlineCmd.code).toBe(126);

    const nulCmd = await exec("node\0evil", [], { quiet: true });
    expect(nulCmd.code).toBe(126);
    expect(nulCmd.stderr).toMatch(/Invalid command/i);

    const nulArg = await exec(process.execPath, ["ok", "bad\0arg"], { quiet: true });
    expect(nulArg.code).toBe(126);
    expect(nulArg.stderr).toMatch(/null byte/i);
  });

  it("does not invoke a POSIX shell for metacharacters in arguments", async () => {
    const payload = "$(echo injected); && | `whoami`";
    const res = await exec(
      process.execPath,
      ["-e", "process.stdout.write(process.argv[1])", payload],
      { quiet: true },
    );
    expect(res.code).toBe(0);
    expect(res.stdout).toBe(payload);
  });
});

describe("execOrThrow", () => {
  it("resolves on exit 0 and throws with exit code and stderr/stdout details on failure", async () => {
    const ok = await execOrThrow(process.execPath, ["-e", "process.stdout.write('ok')"]);
    expect(ok.stdout).toBe("ok");

    await expect(
      execOrThrow(process.execPath, ["-e", "console.error('boom'); process.exit(3)"]),
    ).rejects.toThrow(/exited 3[\s\S]*boom/);

    await expect(
      execOrThrow(process.execPath, ["-e", "process.stdout.write('stdout-err'); process.exit(7)"]),
    ).rejects.toThrow(/exited 7[\s\S]*stdout-err/);
  });
});

describe("quoteForCmd", () => {
  it("escapes Windows cmd.exe metacharacters and rejects CR/LF/NUL", () => {
    expect(quoteForCmd("simple-arg_1.txt")).toBe("simple-arg_1.txt");
    expect(quoteForCmd("hello world")).toBe('"hello world"');
    expect(quoteForCmd('a&b|c<d>e^f%PATH%!VAR!"q"')).toBe('"a^&b^|c^<d^>e^^f^%PATH^%^!VAR^!""q"""');

    expect(() => quoteForCmd("line1\nline2")).toThrow(/NUL, CR, or LF/);
    expect(() => quoteForCmd("line1\rline2")).toThrow(/NUL, CR, or LF/);
    expect(() => quoteForCmd("nul\0byte")).toThrow(/NUL, CR, or LF/);
  });
});

describe("parseJsonTail", () => {
  it("extracts JSON objects or arrays from noisy stdout streams", () => {
    expect(
      parseJsonTail<{ ok: boolean; count: number }>(
        'Starting tool...\n{"ok":true,"count":3}\nDone.',
      ),
    ).toEqual({ ok: true, count: 3 });

    expect(parseJsonTail<number[]>("log line\n[1, 2, 3]\ntrailer")).toEqual([1, 2, 3]);
    expect(
      parseJsonTail<{ nested: { a: number[] }; msg: string }>(
        'info: ready\n{"nested":{"a":[1,2]},"msg":"ok"} trailing } noise',
      ),
    ).toEqual({ nested: { a: [1, 2] }, msg: "ok" });
    expect(parseJsonTail("")).toBeNull();
    expect(parseJsonTail("plain text without json")).toBeNull();
    expect(parseJsonTail("{ broken json")).toBeNull();
  });
});
