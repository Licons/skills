#!/bin/bash

SKILLS_DIR="$(pwd)"
DEST_SKILLS="/.claude/skills"
SKILLS=(
  do-urd
  do-test
  verify-e2e
  run-graphify
)

DESTINATIONS=(
  "../VietBank/Utop.VietBank.CRM"
  "../VietBank/Utop.VietBank.CRM.1"
  # "../VietBank/Utop.VietBank.CRM.2"
)

for DEST in "${DESTINATIONS[@]}"; do
  EXCLUDE_FILE="$DEST/.git/info/exclude"
  for SKILL in "${SKILLS[@]}"; do
    echo "Copying $SKILLS_DIR/$SKILL -> $DEST$DEST_SKILLS"
    cp -fr "$SKILLS_DIR/$SKILL" "$DEST$DEST_SKILLS"
    PATTERN="**/skills/$SKILL"
    if ! grep -qF "$PATTERN" "$EXCLUDE_FILE" 2>/dev/null; then
      echo "$PATTERN" >> "$EXCLUDE_FILE"
      echo "Added $PATTERN to $EXCLUDE_FILE"
    fi
  done
done

echo
echo "Done!"
