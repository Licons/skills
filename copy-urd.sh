#!/bin/bash

SOURCE="$(pwd)/do-urd"
TEST_SOURCE="$(pwd)/do-test"
SKILL_PATH="/.claude/skills"
DESTINATIONS=(
  "../VietBank/Utop.VietBank.CRM"
  "../VietBank/Utop.VietBank.CRM.1"
  # "../VietBank/Utop.VietBank.CRM.2"
)

for DEST in "${DESTINATIONS[@]}"; do
  echo "Copying $SOURCE -> $DEST$SKILL_PATH"
  cp -fr "$SOURCE" "$DEST$SKILL_PATH"
done

for DEST in "${DESTINATIONS[@]}"; do
  echo "Copying $TEST_SOURCE -> $DEST$SKILL_PATH"
  cp -fr "$TEST_SOURCE" "$DEST$SKILL_PATH"
done

echo "Done!"
