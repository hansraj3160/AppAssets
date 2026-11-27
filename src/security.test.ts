import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import test from "node:test";
import { exec, quoteForCmd } from "./exec.ts";
import {
  assertSafeHttpUrl,
  assertSafeId,
  assertValidDeviceKey,
  assertValidLocale,
  escapeRegExp,
  resolveContainedPath,
  sanitizeDownloadFilename,
  sanitizeThemeColor,
  sanitizeZipEntryName,
} from "./security.ts";
import {
  createStudioRequestHandler,
  deleteHandler,
  importHandler,
  localesHandler,
  replaceCaptureHandler,
  selectedExportZipHandler,
  singleExportHandler,
  type StudioApi,
  studioPaths,
  syncCapturesHandler,
  updateLocalesInConfig,
} from "./studio-server.ts";
import { zipDirs, zipEntries } from "./zip.ts";

function makeMockReq(opts: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
}): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = opts.method ?? "GET";
  req.url = opts.url ?? "/";
  req.headers = opts.headers ?? {};
  req.destroy = (() => req) as unknown as IncomingMessage["destroy"];
  queueMicrotask(() => {
    if (opts.body !== undefined) {
      req.emit("data", Buffer.from(opts.body, "utf8"));
    }
    req.emit("end");
  });
  return req;
}

function makeMockRes(): {
  res: ServerResponse;
  done: Promise<{ status: number; headers: Record<string, unknown>; body: string }>;
} {
  let resolveDone!: (value: {
    status: number;
    headers: Record<string, unknown>;
    body: string;
  }) => void;
  const done = new Promise<{ status: number; headers: Record<string, unknown>; body: string }>(
    (r) => {
      resolveDone = r;
    },
  );
  const headers: Record<string, unknown> = {};
  const chunks: Buffer[] = [];
  const res = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8"));
      callback();
    },
  }) as unknown as ServerResponse;
  res.statusCode = 200;
  res.setHeader = ((name: string, val: unknown) => {
    headers[name.toLowerCase()] = val;
    return res;
  }) as ServerResponse["setHeader"];
  res.writeHead = ((status: number, hdrs?: Record<string, unknown>) => {
    res.statusCode = status;
    if (hdrs) {
      for (const [k, v] of Object.entries(hdrs)) {
        headers[k.toLowerCase()] = v;
      }
    }
    return res;
  }) as unknown as ServerResponse["writeHead"];
  res.on("finish", () => {
    resolveDone({
      status: res.statusCode,
      headers,
      body: Buffer.concat(chunks).toString("utf8"),
    });
  });
  return { res, done };
}

test("exec.ts rejects null bytes and unsafe control characters", async () => {
  const nullCmd = await exec("echo\0bad", ["hi"], { quiet: true });
  assert.equal(nullCmd.code, 126);

  const nullArg = await exec("echo", ["ok", "bad\0arg"], { quiet: true });
  assert.equal(nullArg.code, 126);

  const valid = await exec(process.execPath, ["-e", "process.stdout.write('safe')"], {
    quiet: true,
  });
  assert.equal(valid.code, 0);
  assert.equal(valid.stdout, "safe");
});

test("quoteForCmd blocks newline injection and escapes cmd.exe metacharacters", () => {
  assert.throws(() => quoteForCmd("ok\ncalc.exe"), /NUL, CR, or LF/);
  assert.throws(() => quoteForCmd("ok\rcalc.exe"), /NUL, CR, or LF/);
  assert.throws(() => quoteForCmd("ok\0calc.exe"), /NUL, CR, or LF/);

  const escaped = quoteForCmd('a" & %COMSPEC% | !PATH! > out');
  assert.ok(!escaped.includes('\\"'), "must not use POSIX backslash escaping for cmd.exe");
  assert.ok(escaped.includes('""'));
  assert.ok(escaped.includes("^%COMSPEC^%"));
  assert.ok(escaped.includes("^&"));
  assert.ok(escaped.includes("^|"));
  assert.ok(escaped.includes("^!"));
  assert.ok(escaped.includes("^>"));
});

test("zip.ts blocks Zip-Slip entry names and directory/symlink traversal", async () => {
  assert.throws(() => sanitizeZipEntryName("../evil.txt"), /Path traversal/);
  assert.throws(() => sanitizeZipEntryName("a/../../evil.txt"), /Path traversal/);
  assert.throws(() => sanitizeZipEntryName("/etc/passwd"), /Absolute ZIP/);
  assert.throws(() => sanitizeZipEntryName("C:\\Windows\\win.ini"), /Absolute ZIP/);
  assert.throws(() => sanitizeZipEntryName("safe\0.png"), /Invalid ZIP entry/);
  assert.equal(sanitizeZipEntryName("AppStore\\iPhone-6.3/en-US/01-home.png"), "AppStore/iPhone-6.3/en-US/01-home.png");

  assert.throws(
    () => zipEntries([{ name: "../../etc/cron.d/pwn", data: Buffer.from("x") }]),
    /Path traversal/,
  );

  const base = await mkdtemp(join(tmpdir(), "appassets-sec-zip-"));
  const root = join(base, "workspace");
  const outside = join(base, "secret.txt");
  await mkdir(join(root, "screenshots"), { recursive: true });
  await writeFile(join(root, "screenshots", "ok.png"), "ok");
  await writeFile(outside, "top-secret");

  try {
    // Reject traversing dirs outside root
    await assert.rejects(
      () => zipDirs(root, ["../"], join(root, "out.zip")),
      /escapes archive root/,
    );

    // Skip symlinks pointing outside root
    await symlink(outside, join(root, "screenshots", "leak.png"));
    const outZip = join(root, "safe.zip");
    const count = await zipDirs(root, ["screenshots"], outZip);
    assert.equal(count, 1);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("security helpers enforce strict allowlists and path confinement", () => {
  assert.equal(assertSafeId("01-home_screen"), "01-home_screen");
  assert.throws(() => assertSafeId("../../etc/passwd", "sceneId"));
  assert.throws(() => assertSafeId("foo/bar", "sceneId"));
  assert.throws(() => assertSafeId("foo\\bar", "sceneId"));

  assert.equal(assertValidDeviceKey("iphone-6.9"), "iphone-6.9");
  assert.equal(assertValidDeviceKey("iphone-6.3", { allowIphoneAliases: true }), "iphone-6.9");
  assert.throws(() => assertValidDeviceKey("../../etc"));

  assert.equal(assertValidLocale("en-US"), "en-US");
  assert.equal(assertValidLocale("zh-Hans-CN"), "zh-Hans-CN");
  assert.throws(() => assertValidLocale('en-US"], ...(process.exit(1), {}) /*'));
  assert.throws(() => assertValidLocale("../../etc"));

  // Sibling prefix bypass check (/tmp/web vs /tmp/web-secret)
  const sibling = resolveContainedPath("/tmp/web", ["../web-secret/key.txt"]);
  assert.equal(sibling, null);
  assert.equal(resolveContainedPath("/tmp/web", ["images/hero.png"]), "/tmp/web/images/hero.png");

  assert.equal(escapeRegExp("a+b(c)?[d]"), "a\\+b\\(c\\)\\?\\[d\\]");
  assert.equal(sanitizeDownloadFilename('../bad\r\n"name.png'), "_bad_name.png");
  assert.equal(sanitizeThemeColor('"><script>alert(1)</script>'), "#007aff");
  assert.equal(sanitizeThemeColor("#FF6B00"), "#FF6B00");

  assert.equal(assertSafeHttpUrl("http://localhost:3000/studio"), "http://localhost:3000/studio");
  assert.throws(() => assertSafeHttpUrl("file:///etc/passwd"));
  assert.throws(() => assertSafeHttpUrl("http://localhost:3000/&calc.exe"));
});

test("studio-server routes block path traversal and config code injection", async () => {
  const base = await mkdtemp(join(tmpdir(), "appassets-sec-srv-"));
  const cfgPath = join(base, "appassets.config.ts");
  const initialConfig = `export default {\n  devices: ["iphone-6.9"],\n  locales: ["en-US"],\n  scenes: [],\n};\n`;
  await writeFile(cfgPath, initialConfig, "utf8");
  await mkdir(join(base, "out", "web"), { recursive: true });
  await writeFile(join(base, "out", "web", "hello.txt"), "hello", "utf8");
  await mkdir(join(base, "out", "web-secret"), { recursive: true });
  await writeFile(join(base, "out", "web-secret", "secret.txt"), "secret", "utf8");

  const api: StudioApi = {
    paths: studioPaths(cfgPath),
    cli: [process.execPath, "-e", "process.exit(0)"],
  };

  try {
    // 1. POST /api/replace-capture blocks sceneId traversal
    {
      const { res, done } = makeMockRes();
      replaceCaptureHandler(api)(
        makeMockReq({
          method: "POST",
          url: "/api/replace-capture",
          body: JSON.stringify({
            sceneId: "../../../../tmp/evil-capture",
            targetMode: "single",
            device: "iphone-6.9",
            file: { name: "x.png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" },
          }),
        }),
        res,
      );
      const out = await done;
      assert.equal(out.status, 400);
      assert.equal(existsSync("/tmp/evil-capture.png"), false);
    }

    // 2. POST /api/delete blocks sceneId traversal
    {
      const { res, done } = makeMockRes();
      deleteHandler(api)(
        makeMockReq({
          method: "POST",
          url: "/api/delete",
          body: JSON.stringify({ sceneId: "../../../outside" }),
        }),
        res,
      );
      const out = await done;
      assert.equal(out.status, 400);
    }

    // 3. POST /api/sync-captures blocks device traversal
    {
      const { res, done } = makeMockRes();
      syncCapturesHandler(api)(
        makeMockReq({
          method: "POST",
          url: "/api/sync-captures",
          body: JSON.stringify({ sourceDevice: "../../etc", targetDevices: ["../../tmp"] }),
        }),
        res,
      );
      const out = await done;
      assert.equal(out.status, 400);
    }

    // 4. POST /api/import blocks invalid preferredDevice
    {
      const { res, done } = makeMockRes();
      importHandler(api)(
        makeMockReq({
          method: "POST",
          url: "/api/import",
          body: JSON.stringify({
            targetMode: "single",
            preferredDevice: "../../tmp/evil",
            files: [{ name: "a.png", dataUrl: "data:image/png;base64,iVBORw0KGgo=" }],
          }),
        }),
        res,
      );
      const out = await done;
      assert.equal(out.status, 400);
    }

    // 5. GET /api/export-single blocks traversal in sceneId, device, and locale
    for (const query of [
      "sceneId=../../etc/passwd&device=iphone-6.9&locale=en-US",
      "sceneId=home&device=../../etc&locale=en-US",
      "sceneId=home&device=iphone-6.9&locale=../../etc",
    ]) {
      const { res, done } = makeMockRes();
      singleExportHandler(api)(
        makeMockReq({ method: "GET", url: `/api/export-single?${query}` }),
        res,
      );
      const out = await done;
      assert.equal(out.status, 400, `Expected 400 for query ${query}`);
    }

    // 6. POST /api/export-selected-zip blocks traversal in device/locale/items
    {
      const { res, done } = makeMockRes();
      selectedExportZipHandler(api)(
        makeMockReq({
          method: "POST",
          url: "/api/export-selected-zip",
          body: JSON.stringify({
            device: "../../etc",
            locale: "en-US",
            items: [{ sceneId: "home" }],
          }),
        }),
        res,
      );
      const out = await done;
      assert.equal(out.status, 400);
    }

    // 7. POST /api/locales blocks TypeScript code injection into appassets.config.ts
    {
      const payload = 'en-US"], ...(process.exit(1), {}) /*';
      assert.throws(() => updateLocalesInConfig(initialConfig, [payload]));

      const { res, done } = makeMockRes();
      localesHandler(api)(
        makeMockReq({
          method: "POST",
          url: "/api/locales",
          body: JSON.stringify({ action: "add", locale: payload }),
        }),
        res,
      );
      const out = await done;
      assert.equal(out.status, 400);
      assert.equal(await readFile(cfgPath, "utf8"), initialConfig);
    }

    // 8. Static handler blocks sibling-prefix traversal (/../web-secret/secret.txt)
    {
      const handler = createStudioRequestHandler(api);
      const { res, done } = makeMockRes();
      handler(makeMockReq({ method: "GET", url: "/../web-secret/secret.txt" }), res);
      const out = await done;
      assert.equal(out.status, 404);
      assert.ok(!out.body.includes("secret"));
    }
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("firestore.rules enforces least-privilege, default-deny, and field immutability", async () => {
  const rules = await readFile("firestore.rules", "utf8");
  assert.ok(rules.includes("rules_version = '2';"));
  assert.ok(rules.includes("match /{document=**}"));
  assert.ok(rules.includes("allow read, write: if false;"));
  assert.ok(rules.includes("allow get: if isOwner(userId);"));
  assert.ok(rules.includes("allow list: if false;"));
  assert.ok(rules.includes("allow delete: if false;"));
  assert.ok(rules.includes("isValidUserProfile(incoming(), userId)"));
  assert.ok(rules.includes("data.keys().hasOnly("));
  assert.ok(rules.includes("incoming().isPro == existing().isPro"));
  assert.ok(rules.includes("incoming().plan == existing().plan"));
  assert.ok(rules.includes("incoming().aiCreditsLimit == existing().aiCreditsLimit"));
  assert.ok(rules.includes("request.auth.token.email_verified == true"));
  assert.ok(
    !rules.includes("allow read, write: if request.auth != null"),
    "must not allow unvalidated blanket read/write",
  );
});
