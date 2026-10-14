import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { startPreview } from "./preview-server.mjs";

const playwright = process.env.IMD_PLAYWRIGHT
  ? await import(pathToFileURL(process.env.IMD_PLAYWRIGHT).href)
  : await import("playwright");
const axeModule = process.env.IMD_AXE
  ? await import(pathToFileURL(process.env.IMD_AXE).href)
  : await import("@axe-core/playwright");
const AxeBuilder = axeModule.default;
const snapshot = JSON.parse(
  await readFile("public/data/snapshot.json", "utf8"),
);
const output = process.env.IMD_TEST_OUTPUT || "artifacts";
await mkdir(output, { recursive: true });
const server = await startPreview();
const results = [];
const limitations = [];
const liveMode = process.argv.includes("--live");
const id = Number(
  Object.keys(snapshot.details).find(
    (key) =>
      snapshot.details[key].jobs.length &&
      snapshot.details[key].seat.work.length,
  ),
);
assert.ok(
  Number.isInteger(id),
  "Snapshot must include a real working agent with work history.",
);
const registeredId = snapshot.swarm.seats[id].agentId;

async function check(engine, name, run) {
  try {
    const evidence = await run();
    results.push({ engine, name, passed: true, evidence });
    console.log(`PASS ${engine}: ${name}`);
  } catch (error) {
    results.push({ engine, name, passed: false, error: error.message });
    console.error(`FAIL ${engine}: ${name}\n${error.message}`);
  }
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  assert.ok(sizes.document <= sizes.viewport + 1, JSON.stringify(sizes));
  return sizes;
}
async function axe(page) {
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    report.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  return {
    violations: report.violations.length,
    passes: report.passes.length,
    incomplete: report.incomplete.map((v) => v.id),
  };
}

try {
  for (const name of ["chromium", "webkit"]) {
    let browser;
    try {
      browser = await playwright[name].launch();
    } catch (error) {
      limitations.push(`${name} could not launch: ${error.message}`);
      continue;
    }
    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      const localFailures = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => {
        if (response.url().startsWith(server.url) && response.status() >= 400)
          localFailures.push({
            url: response.url(),
            status: response.status(),
          });
      });
      let mode = "ok";
      let detailMode = "ok";
      let requests = 0;
      if (!liveMode) {
        await page.clock.install({ time: new Date(snapshot.swarm.at + 1000) });
        await page.route("https://**/*", async (route) => {
          const url = new URL(route.request().url());
          if (url.href === "https://api.imd.fun/swarm") {
            requests++;
            if (mode === "fail")
              return route.fulfill({
                status: 503,
                json: { error: "Test outage" },
              });
            if (mode === "malformed")
              return route.fulfill({ status: 200, json: { seats: null } });
            return route.fulfill({ json: snapshot.swarm });
          }
          if (url.host === "imdoffice.fun") {
            const seatMatch = url.pathname.match(/\/seats\/(\d+)(\/standing)?/);
            if (seatMatch) {
              const detail = snapshot.details[seatMatch[1]];
              if (detail && detailMode === "malformed" && !seatMatch[2])
                return route.fulfill({ json: { ...detail.seat, work: [{}] } });
              return detail
                ? route.fulfill({
                    json: seatMatch[2] ? detail.standing : detail.seat,
                  })
                : route.fulfill({ status: 404, json: {} });
            }
            const jobId = url.pathname.split("/jobs/")[1];
            const job = Object.values(snapshot.details)
              .flatMap((d) => d.jobs)
              .find((j) => j.id === jobId);
            if (job) return route.fulfill({ json: job });
          }
          return route.abort();
        });
      }
      await check(
        name,
        liveMode
          ? "Live public API and initial render"
          : "Real captured data replay and initial render",
        async () => {
          await page.goto(server.url);
          await page.waitForSelector(".agent-row");
          await page.locator(".feed-state.is-live").waitFor();
          assert.ok((await page.locator(".agent-row").count()) > 0);
          assert.equal(
            await page.evaluate(() => document.fonts.check("16px Manrope")),
            true,
          );
          return {
            state: await page.locator(".feed-state").innerText(),
            title: await page.title(),
            agentRows: await page.locator(".agent-row").count(),
            browser: browser.version(),
          };
        },
      );
      await check(
        name,
        "Responsive overflow and first-screen search",
        async () => {
          const sizes = [];
          for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({
              width,
              height: width < 650 ? 844 : 1000,
            });
            await page.evaluate(() => scrollTo(0, 0));
            sizes.push(await noOverflow(page));
            if (width === 390) {
              const action = await page
                .getByRole("button", { name: "Find", exact: true })
                .boundingBox();
              assert.ok(action && action.y + action.height < 844);
              const brand = await page.locator(".brand").boundingBox();
              assert.ok(brand && brand.y < 844);
              await page.screenshot({
                path: `${output}/${name}-${liveMode ? "live" : "replay"}-390.png`,
              });
            }
          }
          await page.screenshot({
            path: `${output}/${name}-${liveMode ? "live" : "replay"}-1440.png`,
            fullPage: true,
          });
          return sizes;
        },
      );
      await check(
        name,
        "Directory status filters, sorting, and pagination",
        async () => {
          await page.getByRole("link", { name: "Agents", exact: true }).click();
          await page.waitForFunction(() => document.querySelector('a[href="#agents"]')?.getAttribute("aria-current") === "location");
          assert.equal(
            await page
              .getByRole("link", { name: "Agents", exact: true })
              .getAttribute("aria-current"),
            "location",
          );
          await page
            .getByRole("button", { name: "Working", exact: true })
            .click();
          assert.ok(
            (
              await page.locator(".agent-row .status-badge").allTextContents()
            ).every((text) => text === "Working"),
          );
          await page.getByRole("button", { name: "Idle", exact: true }).click();
          assert.ok(
            (
              await page.locator(".agent-row .status-badge").allTextContents()
            ).every((text) => text === "Idle"),
          );
          await page
            .getByRole("button", { name: "All agents", exact: true })
            .click();
          await page.getByLabel("Sort agents").selectOption("id");
          const first = await page.locator(".agent-open").first().innerText();
          await page
            .getByRole("button", { name: "Next page", exact: true })
            .click();
          const next = await page.locator(".agent-open").first().innerText();
          assert.notEqual(first, next);
          await page
            .getByRole("button", { name: "Previous page", exact: true })
            .click();
          assert.equal(
            await page.locator(".agent-open").first().innerText(),
            first,
          );
          await page.getByLabel("Sort agents").selectOption("accepted");
          const counts = (
            await page
              .locator(".accepted-cell>span:first-of-type")
              .allTextContents()
          ).map((text) => Number(text.replaceAll(",", "")));
          assert.ok(counts.every((n, i) => !i || counts[i - 1] >= n));
          return { firstPage: first, secondPage: next, acceptedCounts: counts };
        },
      );
      await check(
        name,
        "Office and list views select actual agents",
        async () => {
          await page
            .getByRole("button", { name: "Show agent list view" })
            .click();
          assert.equal(await page.locator(".featured-row").count(), 6);
          await page.locator(".featured-row").first().click();
          await page.getByRole("dialog").waitFor();
          await page.keyboard.press("Escape");
          await page.getByRole("dialog").waitFor({ state: "detached" });
          await page.getByRole("button", { name: "Show office view" }).click();
          await page.locator(".agent-pin").first().click();
          await page.getByRole("dialog").waitFor();
          await page
            .getByRole("button", { name: "Close agent details" })
            .click();
          assert.equal(await page.locator(".agent-pin").count(), 6);
        },
      );
      await check(
        name,
        "Search empty state and input error recovery",
        async () => {
          const input = page.getByLabel("Find an agent by ID");
          await input.fill("999999999");
          await page.getByRole("button", { name: "Find", exact: true }).click();
          assert.match(
            await page.locator(".empty-state h3").innerText(),
            /No agent found/,
          );
          await page.getByRole("button", { name: "Show all agents" }).click();
          assert.equal(await input.inputValue(), "");
          await input.fill("agent");
          await input.press("Enter");
          assert.equal(await input.getAttribute("aria-invalid"), "true");
          assert.match(
            await page.locator("#search-error").innerText(),
            /numeric/,
          );
          await input.fill("");
        },
      );
      await check(
        name,
        "Search by seat and registered ID, dialog keyboard focus",
        async () => {
          const input = page.getByLabel("Find an agent by ID");
          await input.fill(`#${id}`);
          await input.press("Enter");
          await page.getByRole("dialog").waitFor();
          assert.equal(
            await page.locator("#detail-heading").innerText(),
            `Agent #${id}`,
          );
          assert.equal(
            await page.evaluate(() =>
              document.activeElement?.getAttribute("aria-label"),
            ),
            "Close agent details",
          );
          await page.keyboard.press("Tab");
          assert.equal(
            await page.evaluate(() =>
              Boolean(document.activeElement?.closest("dialog")),
            ),
            true,
          );
          await page.keyboard.press("Escape");
          await page.getByRole("dialog").waitFor({ state: "detached" });
          assert.equal(
            await page.evaluate(() => document.activeElement?.id),
            "agent-search",
          );
          await input.fill(String(registeredId));
          await input.press("Enter");
          await page.getByRole("dialog").waitFor();
          assert.equal(
            await page.locator("#detail-heading").innerText(),
            `Agent #${id}`,
          );
        },
      );
      await check(
        name,
        "Current task, measured step progress, work history",
        async () => {
          await page.waitForFunction(
            () =>
              !document
                .querySelector(".detail-source")
                ?.textContent.includes("Refreshing"),
          );
          if (!liveMode) {
            const job = snapshot.details[id].jobs[0];
            const done = job.nodes.filter((n) =>
              ["accepted", "completed", "skipped"].includes(n.state),
            ).length;
            const progress = page.locator("progress").first();
            assert.equal(await progress.getAttribute("value"), String(done));
            assert.equal(
              await progress.getAttribute("max"),
              String(job.nodes.length),
            );
            assert.equal(
              await page.locator(".job-steps li").count(),
              snapshot.details[id].jobs.reduce((n, j) => n + j.nodes.length, 0),
            );
          }
          await page
            .getByRole("button", { name: "Work history", exact: true })
            .click();
          await page.waitForSelector(".history-list li");
          assert.ok((await page.locator(".history-list li").count()) > 0);
          await page.locator(".history-list summary").first().click();
          assert.ok(
            (await page.locator(".history-list details[open] p").innerText())
              .length > 10,
          );
          await page.screenshot({
            path: `${output}/${name}-${liveMode ? "live" : "replay"}-history.png`,
          });
          return {
            historyRows: await page.locator(".history-list li").count(),
            detailSource: await page.locator(".detail-source").innerText(),
          };
        },
      );
      await check(
        name,
        "Accessible names, roles, and contrast in detail dialog",
        () => axe(page),
      );
      await check(
        name,
        "Saved agent persists across reload; saved filter and remove",
        async () => {
          await page
            .getByRole("button", { name: "Save agent", exact: true })
            .click();
          await page.keyboard.press("Escape");
          await page.reload();
          await page.waitForSelector(".agent-row");
          await page.getByLabel("Find an agent by ID").fill("");
          await page.getByRole("button", { name: /^Saved/ }).click();
          assert.equal(await page.locator(".agent-row").count(), 1);
          assert.match(
            await page.locator(".agent-open").innerText(),
            new RegExp(`#${id}`),
          );
          await page
            .getByRole("button", { name: `Unsave Agent #${id}`, exact: true })
            .click();
          assert.match(
            await page.locator(".empty-state").innerText(),
            /Keep your favorite/,
          );
          await page.getByRole("button", { name: "Show all agents" }).click();
        },
      );
      if (!liveMode) {
        await check(
          name,
          "Auto-refresh polls, pause stops polling, resume and manual refresh work",
          async () => {
            const before = requests;
            await page.clock.fastForward(31_000);
            await page.waitForFunction(
              () => !document.querySelector(".refresh-button")?.disabled,
            );
            assert.ok(requests > before);
            await page
              .getByRole("button", { name: "Pause auto-refresh" })
              .click();
            const paused = requests;
            await page.clock.fastForward(61_000);
            assert.equal(requests, paused);
            await page
              .getByRole("button", { name: "Refresh activity now" })
              .click();
            await page.waitForFunction(
              () => !document.querySelector(".refresh-button")?.disabled,
            );
            assert.equal(requests, paused + 1);
            await page
              .getByRole("button", { name: "Resume auto-refresh" })
              .click();
            await page.clock.fastForward(31_000);
            await page.waitForFunction(
              () => !document.querySelector(".refresh-button")?.disabled,
            );
            assert.equal(requests, paused + 2);
            return { before, after: requests };
          },
        );
        await check(
          name,
          "Failed and malformed refresh retain data and recover",
          async () => {
            const before = await page.locator(".stat-value").allTextContents();
            for (const failure of ["fail", "malformed"]) {
              mode = failure;
              await page
                .getByRole("button", { name: "Refresh activity now" })
                .click();
              await page
                .locator(".feed-state")
                .filter({ hasText: "Updates unavailable" })
                .waitFor();
              assert.deepEqual(
                await page.locator(".stat-value").allTextContents(),
                before,
              );
            }
            mode = "ok";
            await page
              .getByRole("button", { name: "Retry", exact: true })
              .click();
            await page.waitForFunction(
              () => !document.querySelector(".refresh-button")?.disabled,
            );
            assert.ok(
              !(await page.locator(".feed-state").innerText()).includes(
                "unavailable",
              ),
            );
          },
        );
        await check(
          name,
          "Cold offline load shows dated real snapshot",
          async () => {
            mode = "fail";
            await page.goto(server.url);
            await page
              .locator(".feed-state")
              .filter({ hasText: "Updates unavailable" })
              .waitFor();
            assert.ok((await page.locator(".agent-row").count()) > 0);
            assert.match(
              await page.locator(".notice.warning").innerText(),
              /Showing real data captured/,
            );
            mode = "ok";
            await page
              .getByRole("button", { name: "Retry", exact: true })
              .click();
            await page.waitForFunction(
              () => !document.querySelector(".refresh-button")?.disabled,
            );
          },
        );
      }
      await check(
        name,
        "Agent deep links and invalid deep link recovery",
        async () => {
          await page.goto(`${server.url}#agent/${id}`);
          await page.getByRole("dialog").waitFor();
          assert.match(
            await page.locator("#detail-heading").innerText(),
            new RegExp(`#${id}`),
          );
          await page.keyboard.press("Escape");
          await page.goto(`${server.url}#agent/999999999`);
          await page.locator(".unavailable-agent").waitFor();
          await page
            .getByRole("button", { name: "Dismiss", exact: true })
            .click();
          assert.equal(await page.locator(".unavailable-agent").count(), 0);
        },
      );
      if (!liveMode) {
        await check(
          name,
          "Malformed agent detail retains snapshot and retry recovers",
          async () => {
            detailMode = "malformed";
            await page.goto(`${server.url}#agent/${id}`);
            await page.getByRole("dialog").waitFor();
            await page.locator(".detail-dialog .notice.warning").waitFor();
            assert.match(
              await page.locator(".detail-source").innerText(),
              /Saved details from/,
            );
            detailMode = "ok";
            await page
              .getByRole("button", { name: "Try again", exact: true })
              .click();
            await page.waitForFunction(() =>
              document
                .querySelector(".detail-source")
                ?.textContent.startsWith("Updated"),
            );
            await page.keyboard.press("Escape");
          },
        );
      }
      await check(name, "Accessible overview and mobile controls", async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        return axe(page);
      });
      await check(
        name,
        "Reduced motion and 200% text enlargement",
        async () => {
          await page.emulateMedia({ reducedMotion: "reduce" });
          assert.equal(
            await page.evaluate(
              () =>
                document
                  .getAnimations()
                  .filter((a) => a.playState === "running").length,
            ),
            0,
          );
          await page.evaluate(
            () => (document.documentElement.style.fontSize = "32px"),
          );
          const dimensions = await noOverflow(page);
          await page.getByLabel("Find an agent by ID").fill(String(id));
          await page.getByRole("button", { name: "Find", exact: true }).click();
          await page.getByRole("dialog").waitFor();
          await page.keyboard.press("Escape");
          await page.evaluate(
            () => (document.documentElement.style.fontSize = ""),
          );
          return dimensions;
        },
      );
      await check(
        name,
        "No uncaught script errors or missing local resources",
        async () => {
          assert.deepEqual(errors, []);
          assert.deepEqual(localFailures, []);
          return { scriptErrors: errors, localFailures };
        },
      );
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
  const report = {
    at: new Date().toISOString(),
    mode: liveMode
      ? "live network"
      : "replayed real snapshot; controlled failures and clock",
    sourceCapturedAt: new Date(snapshot.capturedAt).toISOString(),
    results,
    limitations,
  };
  await writeFile(
    `${output}/interaction-${liveMode ? "live" : "replay"}.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `${results.filter((r) => r.passed).length}/${results.length} checks passed. ${limitations.length} browser limitations.`,
  );
  if (results.some((r) => !r.passed) || !results.length || limitations.length)
    process.exitCode = 1;
}
