#!/bin/bash

AGENT_FILE=claude/AGENTS.md
DESTINATIONS=(
  $HOME/.claude
  $HOME/.codex
  $HOME/.config/opencode
)

cp -v claude/.claude.json $HOME
cp -v claude/CLAUDE.md $HOME/.claude
cp -v claude/settings.json $HOME/.claude
cp -v claude/ponytail-statusline.sh $HOME/.claude

for DEST in "${DESTINATIONS[@]}"; do
    mkdir -p $DEST
    cp -v $AGENT_FILE $DEST
done

echo
echo "Done!"
