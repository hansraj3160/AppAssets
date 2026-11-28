import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import test from "node:test";
import {
  clearStatusBar,
  findAvdsForProfiles,
  matchingAvds,
  pinKeyboardAndLocale,
  pinStatusBar,
  resolveUdid,
  setAppearance,
  shutdown,
} from "./device.ts";

async function writeStubBin(binDir: string, name: string, script: string): Promise<void> {
  const filePath = join(binDir, name);
  await writeFile(filePath, `#!/bin/sh\n${script}\n`, "utf8");
  await chmod(filePath, 0o755);
}

async function withEnv<T>(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [k, v] of Object.entries(overrides)) {
    previous.set(k, process.env[k]);
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of previous.entries()) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("findAvdsForProfiles and matchingAvds order AVDs by profile preference and name", async () => {
  const avdRoot = await mkdtemp(join(tmpdir(), "appassets-avd-"));
  try {
    await mkdir(join(avdRoot, "Pixel_B.avd"));
    await writeFile(join(avdRoot, "Pixel_B.avd", "config.ini"), "hw.device.name=pixel_9_pro\n");

    await mkdir(join(avdRoot, "Pixel_A.avd"));
    await writeFile(join(avdRoot, "Pixel_A.avd", "config.ini"), "hw.device.name = pixel_9_pro\n");

    await mkdir(join(avdRoot, "Pixel_Preferred.avd"));
    await writeFile(
      join(avdRoot, "Pixel_Preferred.avd", "config.ini"),
      "hw.device.name=pixel_10_pro\n",
    );

    await mkdir(join(avdRoot, "Unrelated.avd"));
    await writeFile(join(avdRoot, "Unrelated.avd", "config.ini"), "hw.device.name=nexus_5\n");

    await writeFile(join(avdRoot, "notes.txt"), "ignored");

    await withEnv({ ANDROID_AVD_HOME: avdRoot }, async () => {
      const ordered = await findAvdsForProfiles(["pixel_10_pro", "pixel_9_pro"]);
      assert.deepEqual(ordered, ["Pixel_Preferred", "Pixel_A", "Pixel_B"]);

      const pixelMatches = await matchingAvds("pixel-10-pro");
      assert.ok(pixelMatches.includes("Pixel_A"));
      assert.ok(pixelMatches.includes("Pixel_B"));
      assert.equal(pixelMatches.includes("Unrelated"), false);
    });

    await withEnv({ ANDROID_AVD_HOME: join(avdRoot, "missing-dir") }, async () => {
      assert.deepEqual(await findAvdsForProfiles(["pixel_9_pro"]), []);
    });
  } finally {
    await rm(avdRoot, { recursive: true, force: true });
  }
});

test("resolveUdid selects newest iOS runtime simulator and throws actionable error when missing", async () => {
  const binDir = await mkdtemp(join(tmpdir(), "appassets-xcrun-"));
  try {
    const devicesJson = JSON.stringify({
      devices: {
        "com.apple.CoreSimulator.SimRuntime.iOS-18-3": [
          { udid: "OLD-UDID", name: "iPhone 17 Pro Max", state: "Shutdown" },
        ],
        "com.apple.CoreSimulator.SimRuntime.iOS-18-5": [
          { udid: "NEW-UDID", name: "iPhone 17 Pro Max", state: "Booted" },
        ],
        "com.apple.CoreSimulator.SimRuntime.watchOS-11-0": [
          { udid: "WATCH-UDID", name: "iPhone 17 Pro Max", state: "Shutdown" },
        ],
      },
    });
    await writeStubBin(binDir, "xcrun", `cat <<'EOF'\n${devicesJson}\nEOF`);

    await withEnv({ PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` }, async () => {
      const udid = await resolveUdid("iphone-6.9");
      assert.equal(udid, "NEW-UDID");
    });

    // Empty device list triggers actionable error with xcrun simctl create hint
    await writeStubBin(binDir, "xcrun", `echo '{"devices":{}}'`);
    await withEnv({ PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` }, async () => {
      await assert.rejects(resolveUdid("iphone-6.9"), /xcrun simctl create/);
    });
  } finally {
    await rm(binDir, { recursive: true, force: true });
  }
});

test("resolveUdid matches running Android emulator profile, skips physical phones, and errors when none match", async () => {
  const root = await mkdtemp(join(tmpdir(), "appassets-adb-"));
  const binDir = join(root, "bin");
  const avdDir = join(root, "pixel.avd");
  try {
    await mkdir(binDir, { recursive: true });
    await mkdir(avdDir, { recursive: true });
    await writeFile(join(avdDir, "config.ini"), "hw.device.name=pixel_9_pro\n");

    await writeStubBin(
      binDir,
      "adb",
      `if [ "$1" = "devices" ]; then
  printf "List of devices attached\\nR58M12345\\tdevice\\nemulator-5554\\tdevice\\n"
  exit 0
fi
if [ "$1" = "-s" ] && [ "$2" = "emulator-5554" ] && [ "$3" = "emu" ] && [ "$4" = "avd" ]; then
  printf "%s\\nOK\\n" "${avdDir}"
  exit 0
fi
exit 1`,
    );

    await withEnv({ PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` }, async () => {
      const serial = await resolveUdid("pixel-10-pro", { autoBoot: false });
      assert.equal(serial, "emulator-5554");
    });

    // No running emulators + autoBoot: false -> actionable error
    await writeStubBin(binDir, "adb", `printf "List of devices attached\\nR58M12345\\tdevice\\n"`);
    await withEnv({ PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` }, async () => {
      await assert.rejects(
        resolveUdid("pixel-10-pro", { autoBoot: false }),
        /No running emulator uses/,
      );
    });

    // No running emulators + autoBoot: true + empty AVD home -> actionable avdmanager error
    await withEnv(
      {
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
        ANDROID_AVD_HOME: join(root, "empty-avds"),
      },
      async () => {
        await assert.rejects(resolveUdid("pixel-10-pro", { autoBoot: true }), /avdmanager create/);
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pinStatusBar, clearStatusBar, setAppearance, shutdown, and pinKeyboardAndLocale emit expected CLI commands", async () => {
  const root = await mkdtemp(join(tmpdir(), "appassets-devcmds-"));
  const binDir = join(root, "bin");
  const logFile = join(root, "commands.log");
  try {
    await mkdir(binDir, { recursive: true });
    for (const tool of ["xcrun", "adb", "defaults"]) {
      await writeStubBin(binDir, tool, `echo "${tool} $*" >> "${logFile}"`);
    }

    await withEnv({ PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}` }, async () => {
      await pinStatusBar("iphone-6.9", "SIM-1");
      await clearStatusBar("iphone-6.9", "SIM-1");
      await setAppearance("iphone-6.9", "SIM-1", "dark");
      await shutdown("iphone-6.9", "SIM-1");
      await pinKeyboardAndLocale("SIM-1", "fr-FR");

      await pinStatusBar("pixel-10-pro", "emulator-5554");
      await clearStatusBar("pixel-10-pro", "emulator-5554");
      await setAppearance("pixel-10-pro", "emulator-5554", "light");
      await shutdown("pixel-10-pro", "emulator-5554");
    });

    const lines = (await readFile(logFile, "utf8")).trim().split("\n");
    assert.ok(lines.some((l) => l.includes("xcrun simctl status_bar SIM-1 override --time 9:41")));
    assert.ok(lines.some((l) => l === "xcrun simctl status_bar SIM-1 clear"));
    assert.ok(lines.some((l) => l === "xcrun simctl ui SIM-1 appearance dark"));
    assert.ok(lines.some((l) => l === "xcrun simctl shutdown SIM-1"));

    assert.ok(lines.some((l) => l.includes("defaults write") && l.includes("AppleLocale -string fr_FR")));
    assert.ok(lines.some((l) => l.includes("defaults write") && l.includes("AppleLanguages -array fr")));
    assert.ok(
      lines.some((l) => l.includes("defaults write") && l.includes("KeyboardAutocorrection -bool false")),
    );

    assert.ok(lines.some((l) => l.includes("adb -s emulator-5554 shell settings put global sysui_demo_allowed 1")));
    assert.ok(lines.some((l) => l.includes("adb -s emulator-5554 shell am broadcast -a com.android.systemui.demo -e command exit")));
    assert.ok(lines.some((l) => l === "adb -s emulator-5554 shell cmd uimode night no"));
    assert.ok(lines.some((l) => l === "adb -s emulator-5554 emu kill"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
