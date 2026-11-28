import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { exec, execOrThrow, parseJsonTail, quoteForCmd } from "./exec.ts";

test("exec captures stdout, stderr, exit codes, and cwd cleanly", async () => {
  const dir = await mkdtemp(join(tmpdir(), "appassets-exec-"));
  try {
    const ok = await exec(
      process.execPath,
      ["-e", "process.stdout.write('hello'); process.stderr.write('warn');"],
      { cwd: dir, quiet: true },
    );
    assert.equal(ok.code, 0);
    assert.equal(ok.stdout, "hello");
    assert.equal(ok.stderr, "warn");

    const cwdRes = await exec(process.execPath, ["-e", "process.stdout.write(process.cwd())"], {
      cwd: dir,
      quiet: true,
    });
    assert.equal(cwdRes.code, 0);
    assert.ok(cwdRes.stdout.endsWith(dir.split("/").pop()!));

    const fail = await exec(process.execPath, ["-e", "process.exit(42)"], { quiet: true });
    assert.equal(fail.code, 42);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("exec returns 127 for missing binaries and 126 for invalid command or NUL bytes", async () => {
  const missing = await exec("appassets-nonexistent-binary-99999", [], { quiet: true });
  assert.equal(missing.code, 127);
  assert.ok(missing.stderr.length > 0);

  const emptyCmd = await exec("   ", [], { quiet: true });
  assert.equal(emptyCmd.code, 126);
  assert.match(emptyCmd.stderr, /Invalid command/i);

  const newlineCmd = await exec("echo\nwhoami", [], { quiet: true });
  assert.equal(newlineCmd.code, 126);

  const nulArg = await exec(process.execPath, ["ok", "bad\0arg"], { quiet: true });
  assert.equal(nulArg.code, 126);
  assert.match(nulArg.stderr, /null byte/i);
});

test("exec does not invoke a POSIX shell for metacharacters in arguments", async () => {
  const payload = "$(echo injected); && | `whoami`";
  const res = await exec(
    process.execPath,
    ["-e", "process.stdout.write(process.argv[1])", payload],
    { quiet: true },
  );
  assert.equal(res.code, 0);
  assert.equal(res.stdout, payload);
});

test("execOrThrow resolves on exit 0 and throws with stderr/stdout details on failure", async () => {
  const ok = await execOrThrow(process.execPath, ["-e", "process.stdout.write('ok')"]);
  assert.equal(ok.stdout, "ok");

  await assert.rejects(
    execOrThrow(process.execPath, ["-e", "console.error('boom'); process.exit(3)"]),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /exited 3/);
      assert.match(err.message, /boom/);
      return true;
    },
  );
});

test("quoteForCmd escapes Windows cmd.exe metacharacters and rejects CR/LF/NUL", () => {
  assert.equal(quoteForCmd("simple-arg_1.txt"), "simple-arg_1.txt");
  assert.equal(quoteForCmd("hello world"), '"hello world"');
  assert.equal(quoteForCmd('a&b|c<d>e^f%PATH%!VAR!"q"'), '"a^&b^|c^<d^>e^^f^%PATH^%^!VAR^!""q"""');

  assert.throws(() => quoteForCmd("line1\nline2"), /NUL, CR, or LF/);
  assert.throws(() => quoteForCmd("line1\rline2"), /NUL, CR, or LF/);
  assert.throws(() => quoteForCmd("nul\0byte"), /NUL, CR, or LF/);
});

test("parseJsonTail extracts JSON objects or arrays from noisy stdout streams", () => {
  assert.deepEqual(
    parseJsonTail<{ ok: boolean; count: number }>('Starting tool...\n{"ok":true,"count":3}\nDone.'),
    { ok: true, count: 3 },
  );
  assert.deepEqual(parseJsonTail<number[]>("log line\n[1, 2, 3]\ntrailer"), [1, 2, 3]);
  assert.equal(parseJsonTail("plain text without json"), null);
  assert.equal(parseJsonTail("{ broken json"), null);
});
