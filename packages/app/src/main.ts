// Entry point. Decide between the interactive TUI and the non-interactive CLI:
// the TUI launches only when invoked bare in an interactive terminal (no args,
// stdin and stdout both TTYs). Any arguments, or piped stdin/stdout, run the CLI.

import pkg from "../package.json" with { type: "json" };

async function main() {
  const argv = process.argv.slice(2);
  const interactive = argv.length === 0 && Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);

  if (interactive) {
    const { runTui } = await import("./tui.js");
    runTui();
    return;
  }

  const { runCli } = await import("./cli.js");
  await runCli(argv, pkg.version);
}

main().catch((err) => {
  process.stderr.write(`rampkit: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
