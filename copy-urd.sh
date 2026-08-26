#!/bin/bash

DO_URD="$(pwd)/do-urd"
DO_TEST="$(pwd)/do-test"
VERIFY_E2E="$(pwd)/verify-e2e"

SKILLS="/.claude/skills"
DESTINATIONS=(
  "../VietBank/Utop.VietBank.CRM"
  "../VietBank/Utop.VietBank.CRM.1"
  # "../VietBank/Utop.VietBank.CRM.2"
)

for DEST in "${DESTINATIONS[@]}"; do
  echo "Copying $DO_URD -> $DEST$SKILLS"
  cp -fr "$DO_URD" "$DEST$SKILLS"
done

echo
for DEST in "${DESTINATIONS[@]}"; do
  echo "Copying $DO_TEST -> $DEST$SKILLS"
  cp -fr "$DO_TEST" "$DEST$SKILLS"
done

echo
for DEST in "${DESTINATIONS[@]}"; do
  echo "Copying $VERIFY_E2E -> $DEST$SKILLS"
  cp -fr "$VERIFY_E2E" "$DEST$SKILLS"
done

echo
echo "Done!"

