# Dependency security review — v1.10.0

The review upgraded Supabase, Vercel Node, esbuild, `form-data`, and `undici`
within compatible release lines. This removed both high-severity findings and
the low-severity esbuild finding without using `npm audit fix --force`.

Four moderate findings remain under `@vercel/python-analysis -> js-yaml`.
They affect YAML merge-key processing in Vercel's Python build analyzer. This
application has no Python build and does not feed user-controlled YAML to that
tooling, so the vulnerable path is not reachable in the deployed app. The
Vercel builder is isolated in `devDependencies`, and `npm audit --omit=dev`
reports no production dependency findings. npm's
suggested remediation is a downgrade from the current Vercel Node builder;
that downgrade was intentionally rejected to avoid deployment compatibility
risk. Recheck this exception when Vercel publishes a patched dependency chain.
