# AGENTS.md

## Repository

Package: `@ankhorage/dependency-graph`

Project-aware dependency analysis that produces canonical `@ankhorage/graph` data.

## Current architecture only

Only the current Ankhorage architecture is valid. Do not add deprecated APIs, compatibility aliases, shims, dual old/new paths, or historical-state fallbacks. Cross-package usage must go through published public APIs and declared dependencies.

## Required repository instructions

Before changing any file, read this file and inspect `.agents/skills/`. Load the repository-local coding-rules and project-structure skills for every change, plus hexagonal architecture for structural work.

## Scope

This package owns dependency topology and evidence. It does not own Cytoscape, UI, update execution, rollback, package-manager mutation, or GitHub repository transport.
