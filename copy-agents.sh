#!/bin/bash

AGENT_FILE=AGENTS.md
DESTINATIONS=(
  $HOME/.claude
  $HOME/.codex
  $HOME/.config/opencode
)

cp -v CLAUDE.md $HOME/.claude
for DEST in "${DESTINATIONS[@]}"; do
    mkdir -p $DEST
    cp -v $AGENT_FILE $DEST
done

echo
echo "Done!"
