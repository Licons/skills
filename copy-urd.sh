#!/bin/bash

SOURCE="$(pwd)/do-urd"
DESTINATIONS=(
  "../VietBank/Utop.VietBank.CRM/.claude/skills"
  "../VietBank/Utop.VietBank.CRM.1/.claude/skills"
  "../VietBank/Utop.VietBank.CRM.2/.claude/skills"
)

for DEST in "${DESTINATIONS[@]}"; do
  echo "Copying $SOURCE -> $DEST"
  cp -fr "$SOURCE" "$DEST"
done

echo "Done!"
